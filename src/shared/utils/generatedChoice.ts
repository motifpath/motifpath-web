/**
 * Generated questions asked among options the server planned: a numeral's chord or a chord's
 * numeral in a key, a chord's function, a progression read as a chart, a chord or a progression
 * heard, a heard chord's numeral named by sight, a chord's quality heard in no key. Grades exactly as the server does, so instant feedback never contradicts the record: the
 * right answer comes from the key, the numeral or the progression; every option must be a possible
 * answer, none twice, and the right answer and the pick must be among them.
 */
import type { components } from '@/api/generated/event-ingestion'
import {
  KEY_NUMERALS,
  NUMERAL_FUNCTION,
  chartOf,
  chartSymbol,
  chordOf,
  chordSymbol,
  isNumeral,
  musicKeyOf,
  numeralsOfCreatedKey,
  parseChord,
  pitchClassOf,
} from '@/shared/utils/harmony'

export type GeneratedWay = components['schemas']['GeneratedChoiceWay']

const WAYS: GeneratedWay[] = [
  'numeral_to_chord',
  'chord_to_numeral',
  'chord_to_function',
  'function_to_chord',
  'chart_to_numbers',
  'numbers_to_chart',
  'cadence_then_chord',
  'progression_by_number',
  'see_then_name',
  'chord_quality_by_ear',
]

/** The qualities a chord heard alone is named by, in the order its options show them. */
export const HEARD_CHORD_QUALITIES = ['major', 'minor', 'dominant7', 'diminished', 'augmented'] as const

/** Whether a value read from elsewhere is a way a generated question is asked. */
export function isGeneratedWay(value: string): value is GeneratedWay {
  return WAYS.some((way) => way === value)
}

/** What a question asks: its way, its key (none for a chord's quality), and its numeral, progression (by catalog key) or quality. */
export interface GeneratedQuestion {
  way: GeneratedWay
  key: string | null
  numeral?: string
  progression?: string
  quality?: string
}

/** The drill progressions the options are checked against, by key, each read in its mode (major when it says none). */
export type ProgressionCatalog = Record<string, { bars: string[]; mode?: string }>

function modeOf(progression: { mode?: string }): string {
  return progression.mode === 'minor' ? 'minor' : 'major'
}

/** What the student answered: the options as shown and the one picked. */
export type GeneratedAnswer = Pick<components['schemas']['GeneratedChoiceResponse'], 'options' | 'choice'>

/** How one way reads its options, and which value is right; null when the question is unknown. */
interface AnswerSpace {
  identify: (option: string) => string | null
  right: string
}

function chordsOfTheKey(key: number): Map<string, string> {
  const chords = new Map<string, string>()
  for (const numeral of KEY_NUMERALS) {
    const chord = chordOf(key, numeral)
    if (chord) chords.set(chordSymbol(chord), numeral)
  }
  return chords
}

/** A chord's quality heard alone, in no key: every option a quality, the item's the right one. */
function qualitySpaceOf(question: GeneratedQuestion): AnswerSpace | null {
  const qualities: readonly string[] = HEARD_CHORD_QUALITIES
  if (question.key !== null || question.quality === undefined || !qualities.includes(question.quality)) return null
  return { identify: (o) => (qualities.includes(o) ? o : null), right: question.quality }
}

function answerSpaceOf(question: GeneratedQuestion, catalog: ProgressionCatalog): AnswerSpace | null {
  if (question.way === 'chord_quality_by_ear') return qualitySpaceOf(question)
  if (question.key === null) return null
  const asked = musicKeyOf(question.key)
  const progression = question.progression === undefined ? undefined : catalog[question.progression]
  // A progression is asked in a key of its mode; any other question in a major key.
  if (asked === null || asked.mode !== (progression ? modeOf(progression) : 'major')) return null
  const key = asked.tonic
  const numeral = question.numeral ?? ''
  switch (question.way) {
    case 'numeral_to_chord':
    case 'function_to_chord': {
      const chord = chordOf(key, numeral)
      const chords = chordsOfTheKey(key)
      const asChordOfTheKey = (option: string) => {
        const parsed = parseChord(option, false)
        const symbol = parsed ? chordSymbol(parsed) : null
        return symbol !== null && chords.has(symbol) ? symbol : null
      }
      return chord ? { identify: asChordOfTheKey, right: chordSymbol(chord) } : null
    }
    case 'chord_to_numeral':
    case 'cadence_then_chord':
    case 'see_then_name':
      return KEY_NUMERALS.includes(numeral) ? { identify: (o) => (KEY_NUMERALS.includes(o) ? o : null), right: numeral } : null
    case 'chord_to_function': {
      const fn = NUMERAL_FUNCTION[numeral]
      const functions = ['tonic', 'subdominant', 'dominant']
      return fn ? { identify: (o) => (functions.includes(o) ? o : null), right: fn } : null
    }
    // A progression's options may be made up: any chart, or progression, of its length and mode.
    case 'numbers_to_chart': {
      const chart = progression ? chartOf(key, progression.bars) : null
      if (!chart) return null
      const asChart = (option: string) => {
        const chords = option.split(' ').map((s) => parseChord(s, true))
        if (chords.length !== chart.length || chords.some((c) => c === null)) return null
        return chords.map((c) => (c ? chordSymbol(c) : '')).join(' ')
      }
      return { identify: asChart, right: chartSymbol(chart) }
    }
    case 'chart_to_numbers':
    case 'progression_by_number': {
      if (!progression || question.progression === undefined) return null
      const { length } = progression.bars
      const mode = modeOf(progression)
      const asProgression = (option: string) => {
        const drill = catalog[option]
        if (drill) return drill.bars.length === length && modeOf(drill) === mode ? option : null
        const madeUp = numeralsOfCreatedKey(option)
        return madeUp && madeUp.mode === mode && madeUp.bars.length === length && madeUp.bars.every(isNumeral) ? option : null
      }
      return { identify: asProgression, right: question.progression }
    }
  }
}

/** The right answer, spelled as the server's answer key spells it; null for an unknown question. */
export function rightAnswerOf(question: GeneratedQuestion, catalog: ProgressionCatalog): string | null {
  return answerSpaceOf(question, catalog)?.right ?? null
}

/**
 * Whether the pick is right; null when the options are no valid set for the question (one isn't a
 * possible answer, one repeats another, the right answer or the pick is missing, or another chord
 * has the asked function) or the question is unknown.
 */
export function gradeGeneratedChoice(question: GeneratedQuestion, catalog: ProgressionCatalog, answer: GeneratedAnswer): boolean | null {
  const space = answerSpaceOf(question, catalog)
  if (!space) return null
  const values: string[] = []
  for (const option of answer.options) {
    const value = space.identify(option)
    if (value === null) return null
    values.push(value)
  }
  if (new Set(values).size !== values.length || !values.includes(space.right)) return null
  const picked = answer.options.indexOf(answer.choice)
  if (picked < 0) return null
  if (question.way === 'function_to_chord' && !oneChordWithTheFunction(question, values)) return null
  return values[picked] === space.right
}

/** Whether the asked chord is the only option with its function. */
function oneChordWithTheFunction(question: GeneratedQuestion, chords: string[]): boolean {
  const key = question.key === null ? null : pitchClassOf(question.key)
  if (key === null) return false
  const numerals = chordsOfTheKey(key)
  const asked = NUMERAL_FUNCTION[question.numeral ?? '']
  return chords.filter((symbol) => NUMERAL_FUNCTION[numerals.get(symbol) ?? ''] === asked).length === 1
}
