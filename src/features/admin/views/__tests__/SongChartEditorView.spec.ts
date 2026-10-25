import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { PropType } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { Router } from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type SongChart = components['schemas']['SongChart']
type SongChartDocument = components['schemas']['SongChartDocument']

const GET = vi.fn()
const POST = vi.fn()
const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET, POST, PUT }, eventApi: {} }),
}))
vi.mock('@/shared/composables/useIsCompact', () => ({
  useIsCompact: () => ({ isCompact: ref(true) }),
}))
const downloadText = vi.fn()
vi.mock('@/shared/utils/downloadText', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  downloadText: (name: string, text: string) => downloadText(name, text),
}))

import SongChartEditorView from '@/features/admin/views/SongChartEditorView.vue'
import { clearChordLookups } from '@/shared/composables/useChordLookup'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { mockViewport } from '@/shared/testUtils/viewport'
import { makeAnchor, makeLyricLine, makeRevision, makeRevisionSummary, makeSection, makeSongChart } from '@/shared/testUtils/songChart'

// The pages' own content is under test, not Teach's navigation around it.
const TeachShellStub = { template: '<div><slot /></div>' }

const ok = <T>(data: T, status = 200) => Promise.resolve({ data, response: new Response(null, { status }) })
const fail = <T>(error: T, status: number) => Promise.resolve({ error, response: new Response(null, { status }) })

/** A draft whose rights an admin has confirmed. */
const rightsConfirmed = { rights_confirmed: true, rights_confirmation: { confirmed_by: { user_id: 'u-ana', display_name: 'Ana' }, confirmed_at: '2026-10-07T12:00:00Z' } }

const ciranda = { type: 'doc' as const, content: [makeSection([makeLyricLine(['Ciranda, cirandinha', null])])] }

const progression = (key: string, en: string) => ({ progression_id: key, key, bars: [], confusable: [], names: { en } })
const PROGRESSIONS = [progression('I-IV-V-I', 'I–IV–V–I'), progression('I-IV-I-V', 'I–IV–I–V')]

/** A draft of Ciranda in C whose verse is tagged I–IV–V–I, which the last save found it doesn't play. */
const unplayedVerse = {
  ...rightsConfirmed,
  concert_key: 'C',
  body: { type: 'doc' as const, content: [makeSection([makeLyricLine(['Ciranda, cirandinha', makeAnchor('a1', 'C')])], { progression_keys: ['I-IV-V-I'] })] },
  unplayed_progressions: [{ section_index: 0, progression_key: 'I-IV-V-I' }],
}

/** The lyrics editor is tested on its own; here it shows its lyrics and can write a line. */
const LyricsEditorStub = defineComponent({
  props: {
    modelValue: { type: Object as PropType<SongChartDocument>, required: true },
    unplayed: { type: Array as PropType<components['schemas']['SongChartUnplayedProgression'][]>, default: () => [] },
    concertKey: { type: String as PropType<string | null>, default: null },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-test': 'lyrics', 'data-unplayed': JSON.stringify(props.unplayed), 'data-concert-key': props.concertKey }, [
        h('span', { 'data-test': 'lyrics-text' }, JSON.stringify(props.modelValue)),
        h('button', { 'data-test': 'write-line', onClick: () => emit('update:modelValue', ciranda) }),
      ])
  },
})

function serve(chart: SongChart | null, revisions = [] as components['schemas']['SongChartRevision'][]) {
  GET.mockImplementation((path: string) => {
    if (path === '/song-charts/{song_chart_id}' && chart) return ok(chart)
    if (path === '/song-charts/{song_chart_id}/revisions') return ok(revisions)
    if (path === '/progressions') return ok(PROGRESSIONS)
    if (path === '/song-charts/{song_chart_id}/chordpro') return ok('{title: Amazing Grace}\n')
    return fail({ message: 'not found' }, 404)
  })
}

async function mountAt(path: string) {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/song-charts', name: 'admin-song-charts', component: { template: '<div data-test="list" />' } },
      { path: '/admin/song-charts/new', name: 'admin-song-chart-new', component: SongChartEditorView },
      { path: '/admin/song-charts/:songChartId', name: 'admin-song-chart', component: SongChartEditorView, props: true },
      { path: '/admin/song-charts/:songChartId/preview', name: 'admin-song-chart-preview', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(
    defineComponent({ render: () => h(RouterView) }),
    { global: { plugins: [router], stubs: { AppBar: true, TeachShell: TeachShellStub, SongChartLyricsEditor: LyricsEditorStub } } },
  )
  await flushPromises()
  return { wrapper, router }
}

/** The value of a text field. */
function valueOf(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper'], selector: string): string {
  const el = wrapper.get(selector).element
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : ''
}

async function click(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper'], selector: string) {
  await wrapper.get(selector).trigger('click')
  await flushPromises()
}

beforeEach(() => {
  GET.mockReset()
  POST.mockReset()
  PUT.mockReset()
  downloadText.mockReset()
  clearChordLookups()
  clearProgressionCatalog()
  mockViewport(1280)
  serve(null)
})

describe('SongChartEditorView', () => {
  describe('a new chart', () => {
    it("marks the title, artist, language and lyrics as needed and saves nothing", async () => {
      const { wrapper } = await mountAt('/admin/song-charts/new')

      await click(wrapper, '[data-test="save"]')

      for (const field of ['title', 'artist', 'language', 'body']) {
        expect(wrapper.find(`[data-test="error-${field}"]`).exists()).toBe(true)
      }
      expect(POST).not.toHaveBeenCalled()
    })

    it('is saved as a draft, and the editor then edits it', async () => {
      const { wrapper, router } = await mountAt('/admin/song-charts/new')
      await wrapper.get('[data-test="title"]').setValue('Amazing Grace')
      await wrapper.get('[data-test="artist"]').setValue('John Newton')
      await wrapper.get('[data-test="language"]').setValue('pt_BR')
      await click(wrapper, '[data-test="write-line"]')
      const created = makeSongChart('chart-new', { body: ciranda })
      POST.mockReturnValueOnce(ok(created, 201))
      serve(created)

      await click(wrapper, '[data-test="save"]')

      expect(POST).toHaveBeenCalledWith('/song-charts', { body: expect.objectContaining({ title: 'Amazing Grace', rights_confirmed: false }) })
      expect(router.currentRoute.value.fullPath).toBe('/admin/song-charts/chart-new')
    })

    it('offers no preview, publishing or export before it is saved', async () => {
      const { wrapper } = await mountAt('/admin/song-charts/new')

      expect(wrapper.find('[data-test="preview"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="publish"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="export"]').exists()).toBe(false)
    })
  })

  describe('importing ChordPro', () => {
    it('fills the editor and lists what was skipped, saving nothing', async () => {
      const { wrapper } = await mountAt('/admin/song-charts/new')
      POST.mockReturnValueOnce(
        ok({
          title: 'Ciranda, Cirandinha', artist: null, concert_key: null, capo_fret: 2, tempo_bpm: null, time_signature: null,
          body: ciranda, import_warnings: [{ line: 3, kind: 'unsupported_directive', text: '{define: G base-fret 1 frets 3 2 0 0 0 3}' }],
        }),
      )

      await click(wrapper, '[data-test="import"]')
      await wrapper.get('[data-test="chordpro-text"]').setValue('{title: Ciranda, Cirandinha}')
      await click(wrapper, '[data-test="chordpro-read"]')

      expect(valueOf(wrapper, '[data-test="title"]')).toBe('Ciranda, Cirandinha')
      expect(wrapper.get('[data-test="lyrics-text"]').text()).toContain('Ciranda, cirandinha')
      expect(wrapper.get('[data-test="import-warnings"]').text()).toContain('3')
      expect(wrapper.get('[data-test="import-warnings"]').text()).toContain('{define: G base-fret 1 frets 3 2 0 0 0 3}')
      expect(POST).toHaveBeenCalledTimes(1)
    })

    it('reads ChordPro from a chosen file', async () => {
      const { wrapper } = await mountAt('/admin/song-charts/new')
      POST.mockReturnValueOnce(ok({ title: 'Ciranda, Cirandinha', artist: null, concert_key: null, capo_fret: 0, tempo_bpm: null, time_signature: null, body: ciranda, import_warnings: [] }))

      await click(wrapper, '[data-test="import"]')
      await click(wrapper, '[data-test="import-source-file"]')
      const input = wrapper.get('[data-test="chordpro-file"]')
      Object.defineProperty(input.element, 'files', { value: [new File(['{title: Ciranda, Cirandinha}'], 'ciranda.cho')] })
      await input.trigger('change')
      await flushPromises()
      expect(wrapper.get('[data-test="chordpro-file-name"]').text()).toBe('ciranda.cho')
      // The file is read on a later tick; Import is offered once its text is in.
      await vi.waitFor(() => expect(wrapper.get('[data-test="chordpro-read"]').attributes('disabled')).toBeUndefined())
      await click(wrapper, '[data-test="chordpro-read"]')

      expect(POST).toHaveBeenCalledWith('/song-charts/chordpro/read', expect.objectContaining({ body: '{title: Ciranda, Cirandinha}' }))
      expect(valueOf(wrapper, '[data-test="title"]')).toBe('Ciranda, Cirandinha')
    })

    it('asks before replacing lyrics already in the editor, and cancelling keeps them', async () => {
      serve(makeSongChart('chart-1'))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      await click(wrapper, '[data-test="import"]')
      await wrapper.get('[data-test="chordpro-text"]').setValue('[C]Outra')
      await click(wrapper, '[data-test="chordpro-read"]')

      expect(wrapper.find('[data-test="confirm-dialog-confirm"]').exists()).toBe(true)
      expect(POST).not.toHaveBeenCalled()
      await click(wrapper, '[data-test="confirm-dialog-cancel"]')
      expect(POST).not.toHaveBeenCalled()
      expect(wrapper.get('[data-test="lyrics-text"]').text()).toContain('Amazing grace')
    })

    it('keeps the pasted text and says why it was refused', async () => {
      const { wrapper } = await mountAt('/admin/song-charts/new')
      POST.mockReturnValueOnce(fail({ message: 'invalid', errors: [{ field: 'body', reason: 'must hold at least one lyric line' }] }, 400))

      await click(wrapper, '[data-test="import"]')
      await wrapper.get('[data-test="chordpro-text"]').setValue('{title: x}')
      await click(wrapper, '[data-test="chordpro-read"]')

      expect(valueOf(wrapper, '[data-test="chordpro-text"]')).toBe('{title: x}')
      expect(wrapper.get('[data-test="chordpro-error"]').text()).toContain('must hold at least one lyric line')
    })

    it('exports the draft as a .cho file named after the chart', async () => {
      serve(makeSongChart('chart-1', { title: 'Amazing Grace' }))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      await click(wrapper, '[data-test="export"]')

      expect(downloadText).toHaveBeenCalledWith('amazing-grace.cho', '{title: Amazing Grace}\n')
    })
  })

  describe('an existing chart', () => {
    it("lists in the status every reason the draft can't be published, and Publish waits", async () => {
      const lines = { type: 'doc' as const, content: [makeSection([makeLyricLine(['Ciranda', null]), makeLyricLine(['vamos todos', makeAnchor('a8', 'H7')])])] }
      serve(makeSongChart('chart-1', { body: lines }))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      expect(wrapper.findAll('[data-test="blocker"]').map((b) => b.text())).toEqual(['Confirm the rights', '“H7” in Verse, line 2, isn’t a chord'])
      expect(wrapper.get('[data-test="publish"]').attributes('disabled')).toBeDefined()
    })

    it('enables Publish once the rights are confirmed and every chord is fine', async () => {
      serve(makeSongChart('chart-1'))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      await wrapper.get('[data-test="rights-confirmed"]').setValue(true)

      expect(wrapper.find('[data-test="blocker"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="publish"]').attributes('disabled')).toBeUndefined()
    })

    it("lists a tag a section doesn't play among the blockers, naming the section, and Publish waits", async () => {
      serve(makeSongChart('chart-1', unplayedVerse))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      expect(wrapper.findAll('[data-test="blocker"]').map((b) => b.text())).toEqual(['Verse: play I–IV–V–I in a row, or remove the tag'])
      expect(wrapper.get('[data-test="publish"]').attributes('disabled')).toBeDefined()
    })

    it('hands the lyrics editor the tags the last save found unplayed, and the key they were checked in', async () => {
      serve(makeSongChart('chart-1', unplayedVerse))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      const lyrics = wrapper.get('[data-test="lyrics"]')
      expect(JSON.parse(lyrics.attributes('data-unplayed') ?? '[]')).toEqual([{ section_index: 0, progression_key: 'I-IV-V-I' }])
      expect(lyrics.attributes('data-concert-key')).toBe('C')
    })

    it('shows who confirmed the rights', async () => {
      serve(makeSongChart('chart-1', { rights_confirmed: true, rights_confirmation: { confirmed_by: { user_id: 'u-ana', display_name: 'Ana' }, confirmed_at: '2026-10-07T12:00:00Z' } }))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      const box = wrapper.get('[data-test="rights-confirmed"]').element
      expect(box instanceof HTMLInputElement && box.checked).toBe(true)
      expect(wrapper.get('[data-test="rights-confirmation"]').text()).toContain('Ana')
    })

    it('links to the preview of the saved draft', async () => {
      serve(makeSongChart('chart-1'))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      expect(wrapper.get('[data-test="preview"]').attributes('href')).toBe('/admin/song-charts/chart-1/preview')
    })

    it('lists the published revisions, newest first', async () => {
      const published = makeSongChart('chart-1', {}, { status: 'published', published_revision: makeRevisionSummary(2) })
      serve(published, [makeRevision(2), makeRevision(1)])
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      expect(wrapper.findAll('[data-test="revision"]').map((r) => r.attributes('data-revision'))).toEqual(['2', '1'])
    })
  })

  describe('publishing and withdrawing', () => {
    it('shows the new revision once published', async () => {
      serve(makeSongChart('chart-1', rightsConfirmed))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')
      POST.mockReturnValueOnce(ok({ revision_number: 1 }, 201))
      serve(makeSongChart('chart-1', {}, { status: 'published', published_revision: makeRevisionSummary(1) }))

      await click(wrapper, '[data-test="publish"]')

      expect(wrapper.get('[data-test="status-text"]').text()).toContain('revision 1')
    })

    it('lists every reason the server refuses to publish', async () => {
      serve(makeSongChart('chart-1', rightsConfirmed))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')
      POST.mockReturnValueOnce(
        fail({
          message: 'not publishable',
          reasons: ['rights_not_confirmed', 'unresolved_chords'],
          anchor_warnings: [{ anchor_id: 'a8', section_index: 1, line_index: 1, written_symbol: 'H7', warning: 'unparsed_symbol', blocks_publication: true }],
        }, 409),
      )

      await click(wrapper, '[data-test="publish"]')

      const refusal = wrapper.get('[data-test="publish-refusal"]')
      expect(refusal.findAll('[data-test="refusal-reason"]')).toHaveLength(2)
      expect(refusal.text()).toContain('H7')
      expect(wrapper.get('[data-test="status-text"]').text()).toContain('Draft')
    })

    it('says so when a section does not play a progression it is tagged with', async () => {
      serve(makeSongChart('chart-1', rightsConfirmed))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')
      POST.mockReturnValueOnce(
        fail({
          message: 'not publishable',
          reasons: ['progressions_not_played'],
          anchor_warnings: [],
          unplayed_progressions: [{ section_index: 0, progression_key: 'I-IV-V-I' }],
        }, 409),
      )

      await click(wrapper, '[data-test="publish"]')

      expect(wrapper.get('[data-test="refusal-reason"]').text()).toBe("A section doesn't play a progression it's tagged with.")
    })

    it('offers no withdrawal for a chart that is not published', async () => {
      serve(makeSongChart('chart-1'))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      expect(wrapper.find('[data-test="withdraw"]').exists()).toBe(false)
    })

    it('withdraws a published chart for the reason given', async () => {
      serve(makeSongChart('chart-1', {}, { status: 'published', published_revision: makeRevisionSummary(1) }))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')
      POST.mockReturnValueOnce(
        ok(makeSongChart('chart-1', {}, {
          status: 'withdrawn',
          withdrawal: { withdrawn_by: { user_id: 'u-ana', display_name: 'Ana' }, withdrawn_at: '2026-10-07T12:00:00Z', reason: 'The rights holder asked us to' },
        })),
      )

      await click(wrapper, '[data-test="withdraw"]')
      await wrapper.get('[data-test="withdraw-reason"]').setValue('The rights holder asked us to')
      await click(wrapper, '[data-test="withdraw-confirm"]')

      expect(POST).toHaveBeenCalledWith('/song-charts/{song_chart_id}/withdraw', expect.objectContaining({ body: { reason: 'The rights holder asked us to' } }))
      expect(wrapper.get('[data-test="status-text"]').text()).toContain('The rights holder asked us to')
      expect(wrapper.get('[data-test="status-text"]').text()).toContain('Ana')
    })
  })

  describe('on a phone', () => {
    beforeEach(() => mockViewport(390))

    it('keeps the status, details and rights, and shows the lyrics as learners see them', async () => {
      serve(makeSongChart('chart-1'))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      expect(wrapper.find('[data-test="status-panel"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="title"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="rights-confirmed"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="lyrics"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="lyrics-read-only"]').text()).toContain('Amazing grace')
      expect(wrapper.find('[data-test="larger-screen-notice"]').exists()).toBe(true)
    })

    it("heads each section of the lyrics with its tags, marking one it doesn't play", async () => {
      serve(makeSongChart('chart-1', unplayedVerse))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      const heading = wrapper.get('[data-test="lyrics-read-only"] [data-test="section-heading"]')
      expect(heading.get('[data-test="progression-chip"]').text()).toBe('I–IV–V–I')
      expect(heading.get('[data-test="progression-chip"]').attributes('data-unplayed')).toBe('true')
      expect(heading.get('[data-test="not-played"]').text()).toContain('its chords never come I–IV–V–I in a row in C')
    })

    it('tags a section from its heading in a sheet, and Save sends the tag', async () => {
      serve(makeSongChart('chart-1'))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      await click(wrapper, '[data-test="lyrics-read-only"] [data-test="add-progression"]')
      const sheet = wrapper.get('[data-test="overlay-sheet"]')
      await sheet.findAll('[data-test="progression-option"]')[1]!.trigger('click')
      await flushPromises()
      expect(wrapper.get('[data-test="lyrics-read-only"] [data-test="progression-chip"]').text()).toBe('I–IV–I–V')

      PUT.mockReturnValueOnce(ok(makeSongChart('chart-1')))
      await click(wrapper, '[data-test="save"]')
      const sent = PUT.mock.calls[0]![1].body.body as SongChartDocument
      expect(sent.content[0]!.attrs.progression_keys).toEqual(['I-IV-I-V'])
    })

    it('removes a tag with its × on the heading', async () => {
      serve(makeSongChart('chart-1', unplayedVerse))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      await click(wrapper, '[data-test="lyrics-read-only"] [data-test="remove-progression"]')

      expect(wrapper.find('[data-test="lyrics-read-only"] [data-test="progression-chip"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="blocker"]').exists()).toBe(false)
    })

    it('puts the larger-screen note under the lyrics, with the larger-screen icon', async () => {
      serve(makeSongChart('chart-1'))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      const lyrics = wrapper.get('[data-test="lyrics-read-only"]').element
      const notice = wrapper.get('[data-test="larger-screen-notice"]')
      expect(lyrics.compareDocumentPosition(notice.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(notice.find('svg.lucide-monitor').exists()).toBe(true)
    })
  })

  describe('withdrawing, in more detail', () => {
    const published = () => makeSongChart('chart-1', {}, { status: 'published', published_revision: makeRevisionSummary(1) })

    it('says what learners lose, and needs a reason', async () => {
      serve(published())
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      await click(wrapper, '[data-test="withdraw"]')

      expect(wrapper.get('[data-test="withdraw-consequence"]').text()).toContain('Learners lose it')
      expect(wrapper.get('[data-test="withdraw-confirm"]').attributes('disabled')).toBeDefined()
    })

    it('is a sheet on a phone', async () => {
      mockViewport(390)
      serve(published())
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      await click(wrapper, '[data-test="withdraw"]')

      expect(wrapper.get('[data-test="withdraw-panel"]').attributes('data-layout')).toBe('sheet')
    })
  })

  describe('leaving', () => {
    it('asks before discarding unsaved changes, and staying keeps them', async () => {
      serve(makeSongChart('chart-1'))
      const { wrapper, router } = await mountAt('/admin/song-charts/chart-1')
      await click(wrapper, '[data-test="write-line"]')

      void router.push('/admin/song-charts')
      await flushPromises()

      expect(wrapper.find('[data-test="confirm-dialog-confirm"]').exists()).toBe(true)
      await click(wrapper, '[data-test="confirm-dialog-cancel"]')
      expect(router.currentRoute.value.fullPath).toBe('/admin/song-charts/chart-1')
    })

    it('leaves without asking when nothing changed', async () => {
      serve(makeSongChart('chart-1'))
      const { router } = await mountAt('/admin/song-charts/chart-1')

      await router.push('/admin/song-charts')

      expect(router.currentRoute.value.fullPath).toBe('/admin/song-charts')
    })
  })
})
