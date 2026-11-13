import type { components } from '@/api/generated/core-domain'
import type { TourState } from '@/features/student/utils/keyTour'
import { drillBass, drillVoicings } from '@/shared/testUtils/drill'
import type { DrillChordSymbol } from '@/shared/testUtils/drill'

type Item = components['schemas']['PracticeSessionItem']
type MusicKey = components['schemas']['MusicKey']

const ORDER: MusicKey[] = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G']

/** I–V–vi–IV in the keys the drill voicings can play; the other keys have no chart. */
const CHARTS: Partial<Record<MusicKey, DrillChordSymbol[]>> = { G: ['G', 'D', 'Em', 'C'], C: ['C', 'G', 'Am', 'C'] }

type BassPattern = components['schemas']['BassPattern']

/** On bass, the window G's chords are marked in: frets 3 to 7. */
const G_WINDOW = 3
const at = (string: number, fret: number) => ({ string, fret })

/**
 * On bass, each chord's root and its third and fifth above and below in G's window, as the plan
 * gives them: a tone no string reaches in the window is null, and no seventh is marked.
 */
const G_TONES = [
  { chord: 'G', root: at(4, 3), third_above: at(4, 7), fifth_above: at(3, 5), third_below: null, fifth_below: null, seventh: null },
  { chord: 'D', root: at(3, 5), third_above: at(2, 4), fifth_above: at(2, 7), third_below: null, fifth_below: at(4, 5), seventh: null },
  { chord: 'Em', root: at(3, 7), third_above: at(2, 5), fifth_above: at(1, 4), third_below: at(4, 3), fifth_below: at(4, 7), seventh: null },
  { chord: 'C', root: at(3, 3), third_above: at(3, 7), fifth_above: at(2, 5), third_below: null, fifth_below: at(4, 3), seventh: null },
]

/**
 * The pop progression's tour, starting in G at 84 BPM; on bass it marks the chord tones on the
 * bass's layout and plays the pattern given, its root alone unless another is given.
 */
export function tourItem(options: { onBass?: boolean; pattern?: BassPattern } = {}): Item {
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
      bass_pattern: options.onBass ? (options.pattern ?? 'root') : null,
      keys: ORDER.map((music_key) => {
        const chart = CHARTS[music_key] ?? []
        return {
          music_key,
          clean: false,
          chart,
          voicings: [...new Set(chart)].map((chord) => ({ chord, diagram_id: drillVoicings[chord].diagram.diagram_id })),
          window_start_fret: options.onBass && music_key === 'G' ? G_WINDOW : null,
          chord_tones: options.onBass && music_key === 'G' ? G_TONES : [],
        }
      }),
    },
  }
}

/** The tour in G with every key before it in the cycle clean. */
export const TOUR_IN_G: TourState = { key: 'G', speed: 84, clean: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D'] }
