/**
 * How a generated drill question is laid out, from the way it is asked and the instrument it is
 * asked for: what the question shows above its options, and what its options are. Guitar reads
 * chords as boxes; bass reads them as chord symbols, and answers a numeral by tapping its root.
 * The plan picks the way; this only says how that way looks.
 */
import type { GeneratedWay } from '@/shared/utils/generatedChoice'

export type DrillInstrument = 'guitar' | 'bass'

/** What a question shows above its options. */
export type DrillStimulus = 'none' | 'chord_box' | 'chord_symbol' | 'chart_boxes' | 'chart_symbols' | 'player'

/** What each option of a question is. */
export type DrillOptionKind = 'text' | 'chord_box' | 'chord_symbol'

export type DrillLayout =
  | { answer: 'choice'; stimulus: DrillStimulus; options: DrillOptionKind }
  /** The answer is a tap on the fretboard, not a pick among options. */
  | { answer: 'fretboard_tap' }

function choice(stimulus: DrillStimulus, options: DrillOptionKind): DrillLayout {
  return { answer: 'choice', stimulus, options }
}

const GUITAR: Record<GeneratedWay, DrillLayout | null> = {
  numeral_to_chord: choice('none', 'chord_box'),
  function_to_chord: choice('none', 'chord_box'),
  chord_to_numeral: choice('chord_box', 'text'),
  chord_to_function: choice('chord_box', 'text'),
  chart_to_numbers: choice('chart_boxes', 'text'),
  numbers_to_chart: null,
  cadence_then_chord: choice('player', 'text'),
  progression_by_number: choice('player', 'text'),
}

const BASS: Record<GeneratedWay, DrillLayout | null> = {
  numeral_to_chord: { answer: 'fretboard_tap' },
  function_to_chord: choice('none', 'chord_symbol'),
  chord_to_numeral: choice('chord_symbol', 'text'),
  chord_to_function: choice('chord_symbol', 'text'),
  chart_to_numbers: choice('chart_symbols', 'text'),
  numbers_to_chart: null,
  cadence_then_chord: choice('player', 'text'),
  progression_by_number: choice('player', 'text'),
}

/** The layout of a way on an instrument; null for a way with no screen designed yet (picking a chart). */
export function drillLayoutOf(way: GeneratedWay, instrument: DrillInstrument): DrillLayout | null {
  return (instrument === 'guitar' ? GUITAR : BASS)[way]
}
