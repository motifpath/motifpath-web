import type { components } from '@/api/generated/core-domain'
import type { TourState } from '@/features/student/utils/keyTour'
import { drillBass, drillVoicings } from '@/shared/testUtils/drill'
import type { DrillChordSymbol } from '@/shared/testUtils/drill'

type Item = components['schemas']['PracticeSessionItem']
type MusicKey = components['schemas']['MusicKey']

const ORDER: MusicKey[] = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G']

/** I–V–vi–IV in the keys the drill voicings can play; the other keys have no chart. */
const CHARTS: Partial<Record<MusicKey, DrillChordSymbol[]>> = { G: ['G', 'D', 'Em', 'C'], C: ['C', 'G', 'Am', 'C'] }

/** On bass, each chord's root, third and fifth in G, at its lowest fret, as the plan gives them. */
const G_TONES = [
  { chord: 'G', root: { string: 1, fret: 0 }, third: { string: 3, fret: 2 }, fifth: { string: 2, fret: 0 } },
  { chord: 'D', root: { string: 2, fret: 0 }, third: { string: 1, fret: 2 }, fifth: { string: 3, fret: 0 } },
  { chord: 'Em', root: { string: 4, fret: 0 }, third: { string: 1, fret: 0 }, fifth: { string: 3, fret: 2 } },
  { chord: 'C', root: { string: 3, fret: 3 }, third: { string: 2, fret: 2 }, fifth: { string: 1, fret: 0 } },
]

/** The pop progression's tour, starting in G at 84 BPM; on bass it marks the chord tones on the bass's layout. */
export function tourItem(options: { onBass?: boolean } = {}): Item {
  const layout = options.onBass ? drillBass.instrument_id : 'guitar'
  return {
    item_key: `progression_keys:${layout}:I-V-vi-IV`,
    kind: 'progression_keys',
    rung: 'move',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 234,
    progression_keys: {
      layout_instrument_id: layout,
      progression: { key: 'I-V-vi-IV', name: 'I–V–vi–IV (pop)' },
      times_through: 4,
      takes: 3,
      start_music_key: 'G',
      tour_tempo_bpm: 84,
      start_note_value: 'quarters',
      target_tempo_bpm: 100,
      min_tempo_bpm: 60,
      keys: ORDER.map((music_key) => {
        const chart = CHARTS[music_key] ?? []
        return {
          music_key,
          clean: false,
          chart,
          voicings: [...new Set(chart)].map((chord) => ({ chord, diagram_id: drillVoicings[chord].diagram.diagram_id })),
          chord_tones: options.onBass && music_key === 'G' ? G_TONES : [],
        }
      }),
    },
  }
}

/** The tour in G with every key before it in the cycle clean. */
export const TOUR_IN_G: TourState = { key: 'G', speed: 84, clean: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D'] }
