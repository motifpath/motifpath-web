import { onMounted, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useEventTracking } from '@/shared/composables/useEventTracking'

type LearnerSongChart = components['schemas']['LearnerSongChart']
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']

/**
 * What a learner does in a song chart, sent as tracking events: the chart opening, each chord's
 * voicings opened, and the song marked as played, once per opening. A preview of a draft has no
 * revision, so it sends nothing; it can still be marked as played.
 */
export function useSongChartTracking(chart: () => LearnerSongChart) {
  const { track } = useEventTracking()
  const played = ref(false)

  function context() {
    const { song_chart_id, revision_number } = chart()
    return revision_number === null ? null : { song_chart_id, revision_number }
  }

  onMounted(() => {
    const song_chart_context = context()
    if (song_chart_context) void track({ event_type: 'song_chart.opened', song_chart_context })
  })

  function chordViewed(anchor: Anchor, chordDefinitionId: string, voicingId: string) {
    const song_chart_context = context()
    if (!song_chart_context) return
    void track({
      event_type: 'song_chart.chord_viewed',
      song_chart_context,
      anchor_id: anchor.anchorId,
      chord_definition_id: chordDefinitionId,
      chord_voicing_id: voicingId,
    })
  }

  function markPlayed() {
    if (played.value) return
    played.value = true
    const song_chart_context = context()
    if (song_chart_context) void track({ event_type: 'song_chart.completed', song_chart_context })
  }

  return { chordViewed, markPlayed, played }
}
