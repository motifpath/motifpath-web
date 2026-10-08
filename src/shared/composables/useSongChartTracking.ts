import { onMounted, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useEventTracking } from '@/shared/composables/useEventTracking'

type LearnerSongChart = components['schemas']['LearnerSongChart']
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']

/**
 * What a learner does in a song chart, sent as tracking events: the chart opening, each chord
 * sheet opened, and each section marked as played, once per section. A preview of a draft has
 * no revision, so it sends nothing; its sections can still be marked as played.
 */
export function useSongChartTracking(chart: () => LearnerSongChart) {
  const { track } = useEventTracking()
  const playedSections = ref(new Set<number>())

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

  function markPlayed(sectionIndex: number) {
    if (playedSections.value.has(sectionIndex)) return
    playedSections.value = new Set(playedSections.value).add(sectionIndex)
    const song_chart_context = context()
    if (song_chart_context) void track({ event_type: 'song_chart.section_completed', song_chart_context, section_index: sectionIndex })
  }

  function isPlayed(sectionIndex: number): boolean {
    return playedSections.value.has(sectionIndex)
  }

  return { chordViewed, markPlayed, isPlayed }
}
