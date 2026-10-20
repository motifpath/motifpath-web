import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

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
const previewOf = vi.fn((songChartId: string) => {
  void songChartId
  return state
})
vi.mock('@/features/admin/composables/useSongChartPreview', () => ({
  useSongChartPreview: (songChartId: string) => previewOf(songChartId),
}))

const push = vi.fn()
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({ push }),
}))

const track = vi.fn()
vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))

import SongChartPreviewView from '@/features/admin/views/SongChartPreviewView.vue'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeLearnerSongChart } from '@/shared/testUtils/songChart'

function mountView() {
  return mount(SongChartPreviewView, {
    props: { songChartId: 'chart-amazing-grace' },
    global: { stubs: { FrettedDiagramView: true, DiagramPlayer: true, RouterLink: true } },
  })
}

beforeEach(() => {
  state.chart.value = null
  state.instrument.value = null
  state.isLoading.value = false
  state.error.value = false
  state.notFound.value = false
  state.retry.mockReset()
  track.mockReset()
  push.mockReset()
})

describe('SongChartPreviewView', () => {
  it('previews the chart named by the route', () => {
    mountView()

    expect(previewOf).toHaveBeenCalledWith('chart-amazing-grace')
  })

  it('shows the draft as a learner would read it, saying it is a preview', () => {
    state.chart.value = makeLearnerSongChart({ revision_number: null })
    state.instrument.value = makeFrettedInstrument()

    const wrapper = mountView()

    expect(wrapper.get('[data-test="preview-banner"]').text()).toBe('Preview of the draft · nothing is recorded')
    expect(wrapper.text()).toContain('Amazing Grace')
    expect(wrapper.findAll('button[data-test="chord-symbol"]').length).toBeGreaterThan(0)
    expect(track).not.toHaveBeenCalled()
  })

  it('closes back to the editor', async () => {
    state.chart.value = makeLearnerSongChart({ revision_number: null })
    state.instrument.value = makeFrettedInstrument()
    const wrapper = mountView()

    await wrapper.get('[data-test="close-song-chart"]').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'admin-song-chart', params: { songChartId: 'chart-amazing-grace' } })
  })

  it('shows loading while the preview loads', () => {
    state.isLoading.value = true

    expect(mountView().find('[data-test="preview-loading"]').exists()).toBe(true)
  })

  it('says when the chart does not exist', () => {
    state.error.value = true
    state.notFound.value = true

    const wrapper = mountView()

    expect(wrapper.find('[data-test="preview-not-found"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="preview-error"]').exists()).toBe(false)
  })

  it('offers a retry when the preview fails to load', async () => {
    state.error.value = true

    const wrapper = mountView()
    await wrapper.find('[data-test="preview-error"] button').trigger('click')

    expect(state.retry).toHaveBeenCalled()
  })
})
