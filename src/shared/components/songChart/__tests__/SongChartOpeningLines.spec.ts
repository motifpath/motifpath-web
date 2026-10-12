import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type LearnerSongChart = components['schemas']['LearnerSongChart']

const chart = ref<LearnerSongChart | null>(null)
vi.mock('@/shared/composables/usePublishedSongChart', () => ({
  usePublishedSongChart: () => ({ chart, instrument: ref(null), isLoading: ref(false), error: ref(false), notFound: ref(false), retry: vi.fn() }),
}))

import SongChartOpeningLines from '@/shared/components/songChart/SongChartOpeningLines.vue'
import { makeAnchor, makeLearnerSongChart, makeLyricLine, makeSection } from '@/shared/testUtils/songChart'

beforeEach(() => {
  chart.value = null
})

describe('SongChartOpeningLines', () => {
  it("shows the first section's heading and its lines, with the chords over the words", () => {
    chart.value = makeLearnerSongChart()
    chart.value.body.content[0]!.attrs.label = 'Verse 1'

    const wrapper = mount(SongChartOpeningLines, { props: { songChartId: 'chart-amazing-grace' } })

    expect(wrapper.get('[data-test="opening-heading"]').text()).toBe('Verse 1')
    expect(wrapper.findAll('[data-test="opening-chord"]').map((c) => c.text())).toEqual(['G', 'C'])
    expect(wrapper.findAll('[data-test="opening-line"]')).toHaveLength(1)
  })

  it('shows at most four lines', () => {
    const line = (word: string) => makeLyricLine([word, makeAnchor(`a-${word}`, 'G', { chordDefinitionId: 'chord-g' })])
    chart.value = makeLearnerSongChart({ body: { type: 'doc', content: [makeSection(['one', 'two', 'three', 'four', 'five'].map(line))] } })

    const wrapper = mount(SongChartOpeningLines, { props: { songChartId: 'chart-amazing-grace' } })

    expect(wrapper.findAll('[data-test="opening-line"]')).toHaveLength(4)
  })

  it('shows nothing until the chart has loaded', () => {
    const wrapper = mount(SongChartOpeningLines, { props: { songChartId: 'chart-amazing-grace' } })

    expect(wrapper.find('[data-test="opening-line"]').exists()).toBe(false)
  })
})
