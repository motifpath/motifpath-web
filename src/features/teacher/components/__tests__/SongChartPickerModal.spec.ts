import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { components } from '@/api/generated/core-domain'

type SongChartSummary = components['schemas']['SongChartSummary']

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import SongChartPickerModal from '@/features/teacher/components/SongChartPickerModal.vue'
import { makeRevisionSummary } from '@/shared/testUtils/songChart'
import { mockViewport } from '@/shared/testUtils/viewport'

function published(id: string, title: string, artist: string, draftTitle = title, language = 'en'): SongChartSummary {
  return {
    song_chart_id: id,
    title: draftTitle,
    artist,
    language: 'pt_BR',
    status: 'published',
    rights_confirmed: true,
    published_revision_number: 1,
    published_revision: { ...makeRevisionSummary(1, title), artist, language },
    updated_by: { user_id: 'u-ana', display_name: 'Ana' },
    updated_at: '2026-10-07T12:00:00Z',
  }
}

const charts = [published('c-1', 'Amazing Grace', 'John Newton', 'Amazing Grace (live)'), published('c-2', 'Ciranda, Cirandinha', 'Tradicional', 'Ciranda, Cirandinha', 'pt_BR')]

function serve() {
  GET.mockImplementation((_path: string, init: { params: { query: { q?: string; status?: string } } }) => {
    const { q } = init.params.query
    const items = charts.filter((c) => !q || `${c.published_revision?.title} ${c.published_revision?.artist}`.toLowerCase().includes(q.toLowerCase()))
    return Promise.resolve({ data: { items, total: items.length, limit: 20, offset: 0 } })
  })
}

// The picker previews the selected chart's card and opening lines, which load on their own.
const stubs = {
  SongChartCard: { props: ['songChartId'], template: '<div data-test="preview-card" :data-song-chart-id="songChartId" />' },
  SongChartOpeningLines: { props: ['songChartId'], template: '<div data-test="preview-lines" :data-song-chart-id="songChartId" />' },
}

function mountPicker() {
  return mount(SongChartPickerModal, { props: { open: true }, attachTo: document.body, global: { stubs } })
}

function find(selector: string) {
  return document.body.querySelector<HTMLElement>(selector)
}

function rows() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('[data-test="song-chart-option"]'))
}

beforeEach(() => {
  mockViewport(390)
  vi.useFakeTimers({ shouldAdvanceTime: true })
  GET.mockReset()
  serve()
  document.body.innerHTML = ''
})

describe('SongChartPickerModal', () => {
  it('lists only published charts, as learners read them', async () => {
    mountPicker()
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/song-charts', expect.objectContaining({ params: { query: expect.objectContaining({ status: 'published' }) } }))
    expect(rows().map((r) => r.textContent)).toEqual([expect.stringContaining('Amazing Grace'), expect.stringContaining('Ciranda, Cirandinha')])
    expect(rows()[0]!.textContent).toContain('John Newton')
    expect(rows()[0]!.textContent).not.toContain('(live)')
  })

  it('searches by title or artist', async () => {
    mountPicker()
    await flushPromises()

    const search = document.body.querySelector<HTMLInputElement>('[data-test="song-chart-search"]')!
    search.value = 'grace'
    search.dispatchEvent(new Event('input'))
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(rows()).toHaveLength(1)
  })

  it('names each chart by its artist, key and language, and counts them', async () => {
    mountPicker()
    await flushPromises()

    expect(rows()[0]!.querySelector('[data-test="song-chart-option-meta"]')!.textContent).toBe('John Newton · Key G · English')
    expect(find('[data-test="song-chart-count"]')!.textContent).toBe('2 published song charts')
  })

  it("says drafts and withdrawn charts aren't listed", async () => {
    mountPicker()
    await flushPromises()

    expect(find('[data-test="song-chart-picker-note"]')!.textContent).toContain('withdrawn')
  })

  describe('on a phone', () => {
    it('is a full-screen layer, where a tap on a chart inserts it', async () => {
      const wrapper = mountPicker()
      await flushPromises()

      expect(find('[data-test="song-chart-picker"]')!.dataset.layout).toBe('layer')
      rows()[1]!.click()

      expect(wrapper.emitted('pick')).toEqual([['c-2']])
    })
  })

  describe('on a wide screen', () => {
    beforeEach(() => mockViewport(1280))

    it('is a dialog that previews the selected chart, first the first one', async () => {
      mountPicker()
      await flushPromises()

      expect(find('[data-test="song-chart-picker"]')!.dataset.layout).toBe('dialog')
      expect(rows()[0]!.getAttribute('aria-selected')).toBe('true')
      expect(find('[data-test="preview-card"]')!.dataset.songChartId).toBe('c-1')
      expect(find('[data-test="preview-lines"]')!.dataset.songChartId).toBe('c-1')
    })

    it('selects a chart with a tap, and inserts it with Insert', async () => {
      const wrapper = mountPicker()
      await flushPromises()

      rows()[1]!.click()
      await flushPromises()
      expect(wrapper.emitted('pick')).toBeUndefined()
      expect(find('[data-test="preview-card"]')!.dataset.songChartId).toBe('c-2')

      find('[data-test="song-chart-insert"]')!.click()
      expect(wrapper.emitted('pick')).toEqual([['c-2']])
    })

    it('closes with Cancel', async () => {
      const wrapper = mountPicker()
      await flushPromises()

      find('[data-test="song-chart-cancel"]')!.click()

      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  it('says when no published chart matches', async () => {
    GET.mockResolvedValue({ data: { items: [], total: 0, limit: 20, offset: 0 } })
    mountPicker()
    await flushPromises()

    expect(document.body.querySelector('[data-test="song-chart-none"]')).not.toBeNull()
  })
})
