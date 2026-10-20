import type { components } from '@/api/generated/core-domain'
import { useApiItem } from '@/shared/composables/useApiItem'
import { useSongChartInstrument } from '@/shared/composables/useSongChartInstrument'

type LearnerSongChart = components['schemas']['LearnerSongChart']

/** A song chart's draft as a learner would read it, and the instrument its voicings are drawn on. */
export function useSongChartPreview(songChartId: string) {
  const { item: chart, isLoading, error, notFound, retry } = useApiItem<LearnerSongChart>((coreApi) =>
    coreApi.GET('/song-charts/{song_chart_id}/preview', { params: { path: { song_chart_id: songChartId } } }),
  )
  const instrument = useSongChartInstrument(chart)

  return { chart, instrument, isLoading, error, notFound, retry }
}
