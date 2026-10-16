/**
 * How a generated drill question is laid out, from the way it is asked and how it reads chords:
 * what the question shows above its options, and what its options are. Guitar reads chords as
 * boxes; bass reads them as chord symbols, and so does any 12-bar chart. The plan picks the way and
 * the reading; this only says how they look.
 */
import type { GeneratedWay } from '@/shared/utils/generatedChoice'

export type DrillInstrument = 'guitar' | 'bass'

/** What a question shows above its options. */
export type DrillStimulus = 'none' | 'chord_box' | 'chord_symbol' | 'chart_boxes' | 'chart_symbols' | 'player'

/** What each option of a question is. */
export type DrillOptionKind = 'text' | 'chord_box' | 'chord_symbol' | 'chart_boxes' | 'chart_symbols'

export interface DrillLayout {
  answer: 'choice'
  stimulus: DrillStimulus
  options: DrillOptionKind
}

function choice(stimulus: DrillStimulus, options: DrillOptionKind): DrillLayout {
  return { answer: 'choice', stimulus, options }
}

const GUITAR: Record<GeneratedWay, DrillLayout> = {
  numeral_to_chord: choice('none', 'chord_box'),
  function_to_chord: choice('none', 'chord_box'),
  chord_to_numeral: choice('chord_box', 'text'),
  chord_to_function: choice('chord_box', 'text'),
  chart_to_numbers: choice('chart_boxes', 'text'),
  numbers_to_chart: choice('none', 'chart_boxes'),
  cadence_then_chord: choice('player', 'text'),
  progression_by_number: choice('player', 'text'),
}

const BASS: Record<GeneratedWay, DrillLayout> = {
  numeral_to_chord: choice('none', 'chord_symbol'),
  function_to_chord: choice('none', 'chord_symbol'),
  chord_to_numeral: choice('chord_symbol', 'text'),
  chord_to_function: choice('chord_symbol', 'text'),
  chart_to_numbers: choice('chart_symbols', 'text'),
  numbers_to_chart: choice('none', 'chart_symbols'),
  cadence_then_chord: choice('player', 'text'),
  progression_by_number: choice('player', 'text'),
}

/** The layout of a way read as an instrument reads chords: guitar draws boxes, bass writes symbols. */
export function drillLayoutOf(way: GeneratedWay, instrument: DrillInstrument): DrillLayout {
  return (instrument === 'guitar' ? GUITAR : BASS)[way]
}
