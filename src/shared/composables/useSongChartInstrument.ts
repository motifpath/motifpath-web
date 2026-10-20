import { computed } from 'vue'
import type { Ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useListInstruments } from '@/shared/composables/useListInstruments'

type LearnerSongChart = components['schemas']['LearnerSongChart']

/**
 * The instrument a song chart's voicings are drawn and played on. Every voicing in a chart is for
 * the same instrument; a chart with no voicings has none.
 */
export function useSongChartInstrument(chart: Ref<LearnerSongChart | null>) {
  const { instruments } = useListInstruments()
  return computed(() => {
    const instrumentId = chart.value?.chords.flatMap((c) => c.voicings)[0]?.instrument_id
    return instrumentId ? (instruments.value.find((i) => i.instrument_id === instrumentId) ?? null) : null
  })
}
