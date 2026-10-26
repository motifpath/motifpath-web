import type { components } from '@/api/generated/core-domain'
import { drillBass } from '@/shared/testUtils/drill'

type Item = components['schemas']['PracticeSessionItem']

export const SONG_CHART_ID = 'chart-amazing-grace'

/** Amazing Grace ending a session on I–IV–I–V, played in its first section: its chords on guitar, its roots on bass. */
export function songItem(options: { onBass?: boolean; sectionIndex?: number } = {}): Item {
  const layout = options.onBass ? drillBass.instrument_id : 'guitar'
  return {
    item_key: `song:${layout}:${SONG_CHART_ID}`,
    kind: 'song',
    rung: 'use',
    reason: 'application',
    node_id: null,
    level: 'new',
    estimated_seconds: 130,
    song: {
      song_chart_id: SONG_CHART_ID,
      layout_instrument_id: layout,
      title: 'Amazing Grace',
      artist: 'John Newton',
      progression_key: 'I-IV-I-V',
      section_index: options.sectionIndex ?? 0,
      plays: options.onBass ? 'roots' : 'chords',
    },
  }
}
