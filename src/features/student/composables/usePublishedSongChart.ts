import type { components } from '@/api/generated/core-domain'
import { useApiItem } from '@/shared/composables/useApiItem'
import { useSongChartInstrument } from '@/shared/composables/useSongChartInstrument'

type LearnerSongChart = components['schemas']['LearnerSongChart']

/**
 * A published song chart for a learner to read, and the instrument its voicings are drawn on. A
 * chart that was withdrawn or never published is not found, the same as one that doesn't exist.
 */
export function usePublishedSongChart(songChartId: string) {
  const { item: chart, isLoading, error, notFound, retry } = useApiItem<LearnerSongChart>((coreApi) =>
    coreApi.GET('/song-charts/{song_chart_id}/published', { params: { path: { song_chart_id: songChartId } } }),
  )
  const instrument = useSongChartInstrument(chart)

  return { chart, instrument, isLoading, error, notFound, retry }
}
