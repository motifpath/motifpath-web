import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const GET = vi.fn()
const POST = vi.fn()
const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET, POST, PUT }, eventApi: {} }),
}))

import { useSongChartEditor } from '@/features/admin/composables/useSongChartEditor'
import { makeLyricLine, makeRevisionSummary, makeSection, makeSongChart } from '@/shared/testUtils/songChart'

const ok = <T>(data: T, status = 200) => Promise.resolve({ data, response: new Response(null, { status }) })
const fail = <T>(error: T, status: number) => Promise.resolve({ error, response: new Response(null, { status }) })

const saved = makeSongChart('chart-1')
const otherLine = { type: 'doc' as const, content: [makeSection([makeLyricLine(['Outra linha', null])])] }

async function loaded(chart = saved) {
  GET.mockImplementation((path: string) => {
    if (path === '/song-charts/{song_chart_id}') return ok(chart)
    if (path === '/song-charts/{song_chart_id}/revisions') return ok([])
    return fail({}, 404)
  })
  const editor = useSongChartEditor(ref('chart-1'))
  await vi.waitFor(() => expect(editor.isLoading.value).toBe(false))
  return editor
}

beforeEach(() => {
  GET.mockReset()
  POST.mockReset()
  PUT.mockReset()
})

describe('useSongChartEditor', () => {
  describe('a new chart', () => {
    it('starts empty, with nothing to save yet', () => {
      const editor = useSongChartEditor(ref(null))

      expect(editor.chart.value).toBeNull()
      expect(editor.details.title).toBe('')
      expect(editor.isDirty.value).toBe(false)
      expect(GET).not.toHaveBeenCalled()
    })

    it("names every field it needs before asking the server, and doesn't save", async () => {
      const editor = useSongChartEditor(ref(null))

      expect(await editor.save()).toBe('invalid')
      expect(Object.keys(editor.fieldErrors.value).sort()).toEqual(['artist', 'body', 'language', 'title'])
      expect(POST).not.toHaveBeenCalled()
    })

    it('is created on its first save', async () => {
      const editor = useSongChartEditor(ref(null))
      Object.assign(editor.details, { title: 'Asa Branca', artist: 'Luiz Gonzaga', language: 'pt_BR' })
      editor.body.value = saved.draft.body
      POST.mockReturnValueOnce(ok(saved, 201))

      expect(await editor.save()).toBe('saved')
      expect(POST).toHaveBeenCalledWith('/song-charts', {
        body: expect.objectContaining({ title: 'Asa Branca', artist: 'Luiz Gonzaga', language: 'pt_BR', rights_confirmed: false, body: saved.draft.body }),
      })
      expect(editor.chart.value).toEqual(saved)
      expect(editor.isDirty.value).toBe(false)
    })
  })

  describe('an existing chart', () => {
    it("loads the draft's details and lyrics", async () => {
      const editor = await loaded(makeSongChart('chart-1', { capo_fret: 3 }))

      expect(editor.details.title).toBe('Asa Branca')
      expect(editor.details.capoFret).toBe(3)
      expect(editor.body.value).toEqual(saved.draft.body)
      expect(editor.isDirty.value).toBe(false)
    })

    it('is dirty once something changes, and clean again once saved', async () => {
      const editor = await loaded()
      editor.details.capoFret = 2
      expect(editor.isDirty.value).toBe(true)
      PUT.mockReturnValueOnce(ok(makeSongChart('chart-1', { capo_fret: 2 })))

      await editor.save()

      expect(PUT).toHaveBeenCalledWith('/song-charts/{song_chart_id}', {
        params: { path: { song_chart_id: 'chart-1' } },
        body: expect.objectContaining({ capo_fret: 2, body: saved.draft.body }),
      })
      expect(editor.isDirty.value).toBe(false)
    })

    it("shows the server's field errors when it refuses the draft", async () => {
      const editor = await loaded()
      editor.details.title = 'x'
      PUT.mockReturnValueOnce(fail({ message: 'invalid', errors: [{ field: 'tempo_bpm', reason: 'must be from 20 to 300' }] }, 400))

      expect(await editor.save()).toBe('invalid')
      expect(editor.fieldErrors.value).toEqual({ tempo_bpm: 'must be from 20 to 300' })
    })
  })

  describe('ChordPro', () => {
    it('fills the lyrics and the details the text sets, keeping the rest, and saves nothing', async () => {
      const editor = useSongChartEditor(ref(null))
      editor.details.artist = 'Luiz Gonzaga'
      POST.mockReturnValueOnce(
        ok({
          title: 'Asa Branca', artist: null, concert_key: null, capo_fret: 2, tempo_bpm: null, time_signature: null,
          body: otherLine, import_warnings: [{ line: 3, kind: 'unsupported_directive', text: '{define: G}' }],
        }),
      )

      expect(await editor.readChordPro('{title: Asa Branca}')).toBe('read')
      expect(POST).toHaveBeenCalledWith('/song-charts/chordpro/read', expect.objectContaining({ body: '{title: Asa Branca}' }))
      expect(editor.details.title).toBe('Asa Branca')
      expect(editor.details.artist).toBe('Luiz Gonzaga')
      expect(editor.details.capoFret).toBe(2)
      expect(editor.body.value).toEqual(otherLine)
      expect(editor.importWarnings.value).toEqual([{ line: 3, kind: 'unsupported_directive', text: '{define: G}' }])
      expect(editor.isDirty.value).toBe(true)
    })

    it("says why text can't be read", async () => {
      const editor = useSongChartEditor(ref(null))
      POST.mockReturnValueOnce(fail({ message: 'invalid', errors: [{ field: 'body', reason: 'must hold at least one lyric line' }] }, 400))

      expect(await editor.readChordPro('{title: x}')).toBe('invalid')
      expect(editor.importError.value).toBe('must hold at least one lyric line')
    })

    it('exports the saved draft', async () => {
      const editor = await loaded()
      GET.mockImplementation(() => ok('{title: Asa Branca}\n'))

      expect(await editor.exportChordPro()).toBe('{title: Asa Branca}\n')
    })
  })

  describe('publishing and withdrawing', () => {
    it('saves unsaved changes, publishes, and shows the new revision', async () => {
      const editor = await loaded()
      editor.details.capoFret = 2
      PUT.mockReturnValueOnce(ok(makeSongChart('chart-1', { capo_fret: 2 })))
      POST.mockReturnValueOnce(ok({ revision_number: 1 }, 201))
      const published = makeSongChart('chart-1', { capo_fret: 2 }, { status: 'published', published_revision: makeRevisionSummary(1) })
      GET.mockImplementation((path: string) => (path === '/song-charts/{song_chart_id}/revisions' ? ok([]) : ok(published)))

      expect(await editor.publish()).toBe('published')
      expect(PUT).toHaveBeenCalled()
      expect(POST).toHaveBeenCalledWith('/song-charts/{song_chart_id}/publish', { params: { path: { song_chart_id: 'chart-1' } } })
      expect(editor.chart.value?.published_revision?.revision_number).toBe(1)
    })

    it('lists every reason publishing is refused', async () => {
      const editor = await loaded()
      const refusal = {
        message: 'not publishable',
        reasons: ['rights_not_confirmed', 'unresolved_chords'],
        anchor_warnings: [{ anchor_id: 'a1', section_index: 0, line_index: 0, written_symbol: 'H7', warning: 'unparsed_symbol', blocks_publication: true }],
      }
      POST.mockReturnValueOnce(fail(refusal, 409))

      expect(await editor.publish()).toBe('refused')
      expect(editor.publishRefusal.value).toEqual(refusal)
    })

    it('withdraws with a reason', async () => {
      const editor = await loaded(makeSongChart('chart-1', {}, { status: 'published', published_revision: makeRevisionSummary(1) }))
      const withdrawn = makeSongChart('chart-1', {}, { status: 'withdrawn' })
      POST.mockReturnValueOnce(ok(withdrawn))

      expect(await editor.withdraw('The rights holder asked us to')).toBe('withdrawn')
      expect(POST).toHaveBeenCalledWith('/song-charts/{song_chart_id}/withdraw', {
        params: { path: { song_chart_id: 'chart-1' } },
        body: { reason: 'The rights holder asked us to' },
      })
      expect(editor.chart.value?.status).toBe('withdrawn')
    })
  })
})

