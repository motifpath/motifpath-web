import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type LearnerSongChart = components['schemas']['LearnerSongChart']
type Instrument = components['schemas']['Instrument']

const state = {
  chart: ref<LearnerSongChart | null>(null),
  instrument: ref<Instrument | null>(null),
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

import SongChartView from '@/features/student/views/SongChartView.vue'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeLearnerSongChart } from '@/shared/testUtils/songChart'

const ReaderStub = defineComponent({
  props: ['chart', 'instrument'],
  setup: (props) => () => h('div', { 'data-test': 'reader' }, props.chart.title),
})

async function mountAt(path: string, from?: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div data-test="home" />' } },
      { path: '/practice', name: 'practice', component: { template: '<div data-test="practice" />' } },
      { path: '/songs/:songChartId', name: 'song-chart', component: SongChartView, props: true },
    ],
  })
  if (from) await router.push(from)
  await router.push(path)
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
    global: { plugins: [router], stubs: { SongChartReader: ReaderStub } },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  state.chart.value = null
  state.instrument.value = null
  state.isLoading.value = false
  state.error.value = false
  state.notFound.value = false
  state.retry.mockReset()
  chartOf.mockClear()
})

describe('SongChartView', () => {
  it('reads the chart the link names, with only a close control around it', async () => {
    state.chart.value = makeLearnerSongChart()
    state.instrument.value = makeFrettedInstrument()

    const { wrapper } = await mountAt('/songs/chart-asa-branca')

    expect(chartOf).toHaveBeenCalledWith('chart-asa-branca')
    expect(wrapper.get('[data-test="reader"]').text()).toBe('Asa Branca')
    expect(wrapper.find('[data-test="close-song-chart"]').exists()).toBe(true)
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it("says a chart that can't be read isn't available, without saying why", async () => {
    state.error.value = true
    state.notFound.value = true

    const { wrapper } = await mountAt('/songs/withdrawn')

    expect(wrapper.find('[data-test="song-chart-unavailable"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="reader"]').exists()).toBe(false)
  })

  it('offers a retry when the chart fails to load', async () => {
    state.error.value = true

    const { wrapper } = await mountAt('/songs/chart-asa-branca')
    await wrapper.get('[data-test="song-chart-error"] button').trigger('click')

    expect(state.retry).toHaveBeenCalled()
  })

  it('closes back to where the student came from', async () => {
    state.chart.value = makeLearnerSongChart()
    const { wrapper, router } = await mountAt('/songs/chart-asa-branca', '/practice')
    const back = vi.spyOn(router, 'back').mockImplementation(() => {})
    window.history.replaceState({ back: '/practice' }, '')

    await wrapper.get('[data-test="close-song-chart"]').trigger('click')

    expect(back).toHaveBeenCalledOnce()
  })

  it('closes to the home when the chart was opened directly', async () => {
    state.chart.value = makeLearnerSongChart()
    const { wrapper, router } = await mountAt('/songs/chart-asa-branca')
    window.history.replaceState({}, '')

    await wrapper.get('[data-test="close-song-chart"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('home')
  })
})
