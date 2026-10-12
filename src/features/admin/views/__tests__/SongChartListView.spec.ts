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
import { makeRevisionSummary } from '@/shared/testUtils/songChart'

// The pages' own content is under test, not Teach's navigation around it.
const TeachShellStub = { template: '<div><slot /></div>' }

function chart(
  id: string,
  title: string,
  artist: string,
  status: SongChartSummary['status'],
  revision: number | null,
  updatedAt = '2026-10-07T12:00:00Z',
): SongChartSummary {
  return {
    song_chart_id: id,
    title,
    artist,
    language: 'en',
    status,
    rights_confirmed: status !== 'draft',
    published_revision_number: revision,
    published_revision: revision === null ? null : makeRevisionSummary(revision, title),
    updated_by: { user_id: 'u-ana', display_name: 'Ana' },
    updated_at: updatedAt,
  }
}

const all = [
  chart('c-1', 'Amazing Grace', 'John Newton', 'published', 1),
  chart('c-2', 'Oh! Susanna', 'Stephen Foster', 'withdrawn', 1),
  chart('c-3', 'Ciranda, Cirandinha', 'Tradicional', 'draft', null),
  // Its draft changed after its latest revision was published.
  chart('c-4', 'Home on the Range', 'Brewster M. Higley', 'published', 2, '2026-10-11T09:00:00Z'),
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
  const wrapper = mount(SongChartListView, { global: { plugins: [router], stubs: { AppBar: true, TeachShell: TeachShellStub } } })
  await flushPromises()
  return wrapper
}

function rows(wrapper: Awaited<ReturnType<typeof mountList>>) {
  return wrapper.findAll('[data-test="song-chart-row"]').map((r) => r.text())
}

function row(wrapper: Awaited<ReturnType<typeof mountList>>, index: number) {
  const r = wrapper.findAll('[data-test="song-chart-row"]')[index]!
  return {
    title: r.get('[data-test="authoring-row-title"]').text(),
    meta: r.get('[data-test="authoring-row-meta"]').text(),
    status: r.get('[data-test="authoring-row-status"]').text(),
  }
}

async function search(wrapper: Awaited<ReturnType<typeof mountList>>, text: string) {
  await wrapper.find('[data-test="song-chart-search"] input').setValue(text)
  await vi.runAllTimersAsync()
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-10-11T15:00:00Z'))
  GET.mockReset()
  serveCharts()
})

describe('SongChartListView', () => {
  it('lists every chart with its artist, language, revision and status, and counts them', async () => {
    const wrapper = await mountList()

    expect(wrapper.get('[data-test="song-chart-count"]').text()).toBe('4 song charts')
    expect(row(wrapper, 0)).toEqual({ title: 'Amazing Grace', meta: 'John Newton · English · Revision 1', status: 'Published' })
    expect(row(wrapper, 1)).toEqual({ title: 'Oh! Susanna', meta: 'Stephen Foster · English · Revision 1 · withdrawn', status: 'Withdrawn' })
    expect(row(wrapper, 2)).toEqual({
      title: 'Ciranda, Cirandinha',
      meta: 'Tradicional · English · never published · rights not confirmed',
      status: 'Draft',
    })
  })

  it('says when a published chart has changes not published yet, and who made them', async () => {
    const wrapper = await mountList()

    expect(row(wrapper, 3)).toEqual({
      title: 'Home on the Range',
      meta: 'Brewster M. Higley · English · Revision 2 · updated by Ana, today',
      status: 'Unpublished changes',
    })
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

    expect(rows(wrapper)).toHaveLength(2)
    expect(rows(wrapper)[0]).toContain('Amazing Grace')
    expect(wrapper.get('[data-test="status-published"]').attributes('aria-pressed')).toBe('true')
  })

  it('searches by title or artist', async () => {
    const wrapper = await mountList()

    await search(wrapper, 'foster')

    expect(rows(wrapper)).toHaveLength(1)
    expect(rows(wrapper)[0]).toContain('Oh! Susanna')
  })

  it('says when no chart matches, and clears the search', async () => {
    const wrapper = await mountList()

    await search(wrapper, 'beethoven')
    expect(wrapper.find('[data-test="no-matches"]').exists()).toBe(true)

    await wrapper.get('[data-test="clear-search"]').trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()
    expect(rows(wrapper)).toHaveLength(4)
  })

  it('offers a retry when the list fails to load', async () => {
    GET.mockResolvedValueOnce({ error: {} })
    const wrapper = await mountList()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })
})
