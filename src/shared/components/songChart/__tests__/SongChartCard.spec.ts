import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type LearnerSongChart = components['schemas']['LearnerSongChart']

const state = {
  chart: ref<LearnerSongChart | null>(null),
  instrument: ref(null),
  isLoading: ref(false),
  error: ref(false),
  notFound: ref(false),
  retry: vi.fn(),
}
const chartOf = vi.fn((songChartId: string) => {
  void songChartId
  return state
})
vi.mock('@/shared/composables/usePublishedSongChart', () => ({
  usePublishedSongChart: (songChartId: string) => chartOf(songChartId),
}))

import SongChartCard from '@/shared/components/songChart/SongChartCard.vue'
import { SONG_CHART_OPENER } from '@/shared/components/songChart/songChartOpener'
import { makeLearnerSongChart } from '@/shared/testUtils/songChart'

async function mountCard(opener?: (id: string) => void) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/songs/:songChartId', name: 'song-chart', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  const wrapper = mount(SongChartCard, {
    props: { songChartId: 'chart-asa-branca' },
    global: { plugins: [router], provide: opener ? { [SONG_CHART_OPENER]: opener } : {} },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  state.chart.value = makeLearnerSongChart()
  state.isLoading.value = false
  state.error.value = false
  state.notFound.value = false
  chartOf.mockClear()
})

describe('SongChartCard', () => {
  it('shows the song, its key, and how it starts with its chords', async () => {
    const { wrapper } = await mountCard()

    expect(chartOf).toHaveBeenCalledWith('chart-asa-branca')
    const card = wrapper.get('[data-test="song-chart-card"]')
    expect(card.text()).toContain('Asa Branca')
    expect(card.text()).toContain('Luiz Gonzaga')
    expect(card.get('[data-test="song-chart-card-key"]').text()).toContain('G')
    expect(card.findAll('[data-test="card-chord"]').map((c) => c.text())).toEqual(['G', 'C'])
    expect(card.findAll('[data-test="card-word"]').map((w) => w.element.textContent).join('')).toBe('Quando olhei a terra ardendo')
  })

  it('shows nothing for a chart that can no longer be read', async () => {
    state.chart.value = null
    state.error.value = true
    state.notFound.value = true

    const { wrapper } = await mountCard()

    expect(wrapper.find('[data-test="song-chart-card"]').exists()).toBe(false)
  })

  it("opens the chart through the page's own opener when it has one", async () => {
    const opener = vi.fn()
    const { wrapper, router } = await mountCard(opener)

    await wrapper.get('[data-test="song-chart-card"]').trigger('click')

    expect(opener).toHaveBeenCalledWith('chart-asa-branca')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it("opens the chart's own page when the page has no opener", async () => {
    const { wrapper, router } = await mountCard()

    await wrapper.get('[data-test="song-chart-card"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/songs/chart-asa-branca')
  })
})
