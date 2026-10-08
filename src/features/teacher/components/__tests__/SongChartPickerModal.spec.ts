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

function published(id: string, title: string, artist: string, draftTitle = title): SongChartSummary {
  return {
    song_chart_id: id,
    title: draftTitle,
    artist,
    language: 'pt_BR',
    status: 'published',
    rights_confirmed: true,
    published_revision_number: 1,
    published_revision: { ...makeRevisionSummary(1, title), artist },
    updated_by: { user_id: 'u-ana', display_name: 'Ana' },
    updated_at: '2026-10-07T12:00:00Z',
  }
}

const charts = [published('c-1', 'Asa Branca', 'Luiz Gonzaga', 'Asa Branca (ao vivo)'), published('c-2', 'Carinhoso', 'Pixinguinha')]

function serve() {
  GET.mockImplementation((_path: string, init: { params: { query: { q?: string; status?: string } } }) => {
    const { q } = init.params.query
    const items = charts.filter((c) => !q || `${c.published_revision?.title} ${c.published_revision?.artist}`.toLowerCase().includes(q.toLowerCase()))
    return Promise.resolve({ data: { items, total: items.length, limit: 20, offset: 0 } })
  })
}

function mountPicker() {
  return mount(SongChartPickerModal, { props: { open: true }, attachTo: document.body })
}

function rows() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('[data-test="song-chart-option"]'))
}

beforeEach(() => {
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
    expect(rows().map((r) => r.textContent)).toEqual([expect.stringContaining('Asa Branca'), expect.stringContaining('Carinhoso')])
    expect(rows()[0]!.textContent).toContain('Luiz Gonzaga')
    expect(rows()[0]!.textContent).not.toContain('ao vivo')
  })

  it('searches by title or artist', async () => {
    mountPicker()
    await flushPromises()

    const search = document.body.querySelector<HTMLInputElement>('[data-test="song-chart-search"]')!
    search.value = 'asa'
    search.dispatchEvent(new Event('input'))
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(rows()).toHaveLength(1)
  })

  it('hands back the picked chart', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    rows()[1]!.click()

    expect(wrapper.emitted('pick')).toEqual([['c-2']])
  })

  it('says when no published chart matches', async () => {
    GET.mockResolvedValue({ data: { items: [], total: 0, limit: 20, offset: 0 } })
    mountPicker()
    await flushPromises()

    expect(document.body.querySelector('[data-test="song-chart-none"]')).not.toBeNull()
  })
})
