import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type SongChartSummary = components['schemas']['SongChartSummary']

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))
vi.mock('@/shared/composables/useIsCompact', () => ({
  useIsCompact: () => ({ isCompact: ref(true) }),
}))

import SongChartListView from '@/features/admin/views/SongChartListView.vue'

function chart(id: string, title: string, artist: string, status: SongChartSummary['status'], revision: number | null): SongChartSummary {
  return {
    song_chart_id: id,
    title,
    artist,
    language: 'en',
    status,
    rights_confirmed: status !== 'draft',
    published_revision_number: revision,
    updated_by: { user_id: 'u-ana', display_name: 'Ana' },
    updated_at: '2026-10-07T12:00:00Z',
  }
}

const all = [
  chart('c-1', 'Amazing Grace', 'John Newton', 'published', 1),
  chart('c-2', 'Oh! Susanna', 'Stephen Foster', 'withdrawn', 1),
  chart('c-3', 'Ciranda, Cirandinha', 'Tradicional', 'draft', null),
]

/** Answers listSongCharts like the server: q matches title or artist, status filters. */
function serveCharts() {
  GET.mockImplementation((_path: string, init: { params: { query: { q?: string; status?: string } } }) => {
    const { q, status } = init.params.query
    const items = all.filter(
      (c) =>
        (!status || c.status === status) &&
        (!q || `${c.title} ${c.artist}`.toLowerCase().includes(q.toLowerCase())),
    )
    return Promise.resolve({ data: { items, total: items.length, limit: 20, offset: 0 } })
  })
}

async function mountList() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/song-charts', name: 'admin-song-charts', component: SongChartListView },
      { path: '/admin/song-charts/new', name: 'admin-song-chart-new', component: { template: '<div />' } },
      { path: '/admin/song-charts/:songChartId', name: 'admin-song-chart', component: { template: '<div />' } },
    ],
  })
  await router.push('/admin/song-charts')
  const wrapper = mount(SongChartListView, { global: { plugins: [router], stubs: { AppBar: true } } })
  await flushPromises()
  return wrapper
}

function rows(wrapper: Awaited<ReturnType<typeof mountList>>) {
  return wrapper.findAll('[data-test="song-chart-row"]').map((r) => r.text())
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  GET.mockReset()
  serveCharts()
})

describe('SongChartListView', () => {
  it('lists every chart with its artist and status', async () => {
    const wrapper = await mountList()

    const listed = rows(wrapper)
    expect(listed).toHaveLength(3)
    expect(listed[0]).toContain('Amazing Grace')
    expect(listed[0]).toContain('John Newton')
    expect(listed[0]).toContain('Published · revision 1')
    expect(listed[1]).toContain('Withdrawn')
    expect(listed[2]).toContain('Draft')
  })

  it('links each chart to its editor, and offers a new chart', async () => {
    const wrapper = await mountList()

    expect(wrapper.find('[data-test="song-chart-row"] a').attributes('href')).toBe('/admin/song-charts/c-1')
    expect(wrapper.find('[data-test="new-song-chart"]').attributes('href')).toBe('/admin/song-charts/new')
  })

  it('shows only the charts in one status', async () => {
    const wrapper = await mountList()

    await wrapper.find('[data-test="status-published"]').trigger('click')
    await flushPromises()

    expect(rows(wrapper)).toHaveLength(1)
    expect(rows(wrapper)[0]).toContain('Amazing Grace')
  })

  it('searches by title or artist', async () => {
    const wrapper = await mountList()

    await wrapper.find('[data-test="song-chart-search"]').setValue('foster')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(rows(wrapper)).toHaveLength(1)
    expect(rows(wrapper)[0]).toContain('Oh! Susanna')
  })

  it('says when no chart matches', async () => {
    const wrapper = await mountList()

    await wrapper.find('[data-test="song-chart-search"]').setValue('beethoven')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(wrapper.find('[data-test="no-matches"]').exists()).toBe(true)
  })

  it('offers a retry when the list fails to load', async () => {
    GET.mockResolvedValueOnce({ error: {} })
    const wrapper = await mountList()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })
})
