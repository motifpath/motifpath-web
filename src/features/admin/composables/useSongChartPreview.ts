import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApiItem } from '@/shared/composables/useApiItem'
import { useListInstruments } from '@/shared/composables/useListInstruments'

type LearnerSongChart = components['schemas']['LearnerSongChart']

/**
 * A song chart's draft as a learner would read it, and the instrument its voicings are drawn on.
 * Every voicing in a chart is for the same instrument; a chart with no voicings has none.
 */
export function useSongChartPreview(songChartId: string) {
  const { item: chart, isLoading, error, notFound, retry } = useApiItem<LearnerSongChart>((coreApi) =>
    coreApi.GET('/song-charts/{song_chart_id}/preview', { params: { path: { song_chart_id: songChartId } } }),
  )
  const { instruments } = useListInstruments()

  const instrument = computed(() => {
    const instrumentId = chart.value?.chords.flatMap((c) => c.voicings)[0]?.instrument_id
    return instrumentId ? (instruments.value.find((i) => i.instrument_id === instrumentId) ?? null) : null
  })

  return { chart, instrument, isLoading, error, notFound, retry }
}
