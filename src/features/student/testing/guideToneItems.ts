import type { components } from '@/api/generated/core-domain'
import { drillBass, drillVoicings } from '@/shared/testUtils/drill'
import type { DrillChordSymbol } from '@/shared/testUtils/drill'

type Item = components['schemas']['PracticeSessionItem']

/** ii–V–I in G (Am D G G) as a guide tone asks it: the third at 60 BPM over 3 takes, in frets 0–5. */
export function guideToneItem(options: { onBass?: boolean; tone?: '3' | '7'; tempo?: number } = {}): Item {
  const layout = options.onBass ? drillBass.instrument_id : 'guitar'
  const chords: DrillChordSymbol[] = ['Am', 'D', 'G', 'G']
  return {
    item_key: `guide_tone:${layout}:ii-V-I`,
    kind: 'guide_tone',
    rung: 'target',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 75,
    guide_tone: {
      layout_instrument_id: layout,
      progression: { key: 'ii-V-I', name: 'ii–V–I' },
      music_key: 'G',
      tone: options.tone ?? '3',
      tempo_bpm: options.tempo ?? 60,
      target_tempo_bpm: 90,
      takes: 3,
      fret_window: { from_fret: 0 },
      bars: chords.map((chord, i) => ({ chord, numeral: ['ii', 'V', 'I', 'I'][i]! })),
      voicings: [...new Set(chords)].map((chord) => ({ chord, diagram_id: drillVoicings[chord].diagram.diagram_id })),
    },
  }
}

/** The guitar's taps that hit every third of ii–V–I in G at 60 BPM (C, F#, B, B), 100 ms into each bar. */
export const EVERY_THIRD_AT_60 = [
  { at_ms: 100, string: 2, fret: 1 },
  { at_ms: 4100, string: 1, fret: 2 },
  { at_ms: 8100, string: 2, fret: 0 },
  { at_ms: 12100, string: 2, fret: 0 },
]
