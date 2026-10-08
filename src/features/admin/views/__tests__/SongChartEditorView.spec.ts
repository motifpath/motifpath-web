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
import { makeLyricLine, makeRevision, makeRevisionSummary, makeSection, makeSongChart } from '@/shared/testUtils/songChart'

const ok = <T>(data: T, status = 200) => Promise.resolve({ data, response: new Response(null, { status }) })
const fail = <T>(error: T, status: number) => Promise.resolve({ error, response: new Response(null, { status }) })

const ciranda = { type: 'doc' as const, content: [makeSection([makeLyricLine(['Ciranda, cirandinha', null])])] }

/** The lyrics editor is tested on its own; here it shows its lyrics and can write a line. */
const LyricsEditorStub = defineComponent({
  props: { modelValue: { type: Object as PropType<SongChartDocument>, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-test': 'lyrics' }, [
        h('span', { 'data-test': 'lyrics-text' }, JSON.stringify(props.modelValue)),
        h('button', { 'data-test': 'write-line', onClick: () => emit('update:modelValue', ciranda) }),
      ])
  },
})

function serve(chart: SongChart | null, revisions = [] as components['schemas']['SongChartRevision'][]) {
  GET.mockImplementation((path: string) => {
    if (path === '/song-charts/{song_chart_id}' && chart) return ok(chart)
    if (path === '/song-charts/{song_chart_id}/revisions') return ok(revisions)
    if (path === '/song-charts/{song_chart_id}/chordpro') return ok('{title: Asa Branca}\n')
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
    { global: { plugins: [router], stubs: { AppBar: true, SongChartLyricsEditor: LyricsEditorStub } } },
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
      await wrapper.get('[data-test="title"]').setValue('Asa Branca')
      await wrapper.get('[data-test="artist"]').setValue('Luiz Gonzaga')
      await wrapper.get('[data-test="language"]').setValue('pt_BR')
      await click(wrapper, '[data-test="write-line"]')
      const created = makeSongChart('chart-new', { body: ciranda })
      POST.mockReturnValueOnce(ok(created, 201))
      serve(created)

      await click(wrapper, '[data-test="save"]')

      expect(POST).toHaveBeenCalledWith('/song-charts', { body: expect.objectContaining({ title: 'Asa Branca', rights_confirmed: false }) })
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
      expect(wrapper.get('[data-test="lyrics-text"]').text()).toContain('Quando olhei')
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

      expect(downloadText).toHaveBeenCalledWith('amazing-grace.cho', '{title: Asa Branca}\n')
    })
  })

  describe('an existing chart', () => {
    it("lists the draft's chords that didn't fully resolve, saying which block publishing", async () => {
      serve(
        makeSongChart('chart-1', {
          warnings: [
            { anchor_id: 'a6', section_index: 1, line_index: 0, written_symbol: 'C/B', warning: 'bass_not_in_catalog', blocks_publication: false },
            { anchor_id: 'a8', section_index: 1, line_index: 1, written_symbol: 'H7', warning: 'unparsed_symbol', blocks_publication: true },
          ],
        }),
      )
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')

      const rows = wrapper.findAll('[data-test="chord-warning"]')
      expect(rows.map((r) => r.attributes('data-blocks'))).toEqual(['false', 'true'])
      expect(rows[1]!.text()).toContain('H7')
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
      serve(makeSongChart('chart-1'))
      const { wrapper } = await mountAt('/admin/song-charts/chart-1')
      POST.mockReturnValueOnce(ok({ revision_number: 1 }, 201))
      serve(makeSongChart('chart-1', {}, { status: 'published', published_revision: makeRevisionSummary(1) }))

      await click(wrapper, '[data-test="publish"]')

      expect(wrapper.get('[data-test="status"]').text()).toContain('revision 1')
    })

    it('lists every reason publishing is refused', async () => {
      serve(makeSongChart('chart-1'))
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
      expect(wrapper.get('[data-test="status"]').text()).toContain('Draft')
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
      expect(wrapper.get('[data-test="withdrawal"]').text()).toContain('The rights holder asked us to')
      expect(wrapper.get('[data-test="withdrawal"]').text()).toContain('Ana')
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
