/**
 * Generated questions asked among options the server planned: a numeral's chord or a chord's
 * numeral in a key, a chord's function, a progression read as a chart, a chord or a progression
 * heard. Grades exactly as the server does, so instant feedback never contradicts the record: the
 * right answer comes from the key, the numeral or the progression; every option must be a possible
 * answer, none twice, and the right answer and the pick must be among them.
 */
import {
  KEY_NUMERALS,
  NUMERAL_FUNCTION,
  chartOf,
  chartSymbol,
  chordOf,
  chordSymbol,
  parseChord,
  pitchClassOf,
} from '@/shared/utils/harmony'

export type GeneratedWay =
  | 'numeral_to_chord'
  | 'chord_to_numeral'
  | 'chord_to_function'
  | 'function_to_chord'
  | 'chart_to_numbers'
  | 'numbers_to_chart'
  | 'cadence_then_chord'
  | 'progression_by_number'

/** What a question asks: its way, its key, and its numeral or progression (by catalog key). */
export interface GeneratedQuestion {
  way: GeneratedWay
  key: string
  numeral?: string
  progression?: string
}

/** The progression catalog the options are checked against, by key. */
export type ProgressionCatalog = Record<string, { bars: string[] }>

/** What the student answered: the options as shown and the one picked. */
export interface GeneratedAnswer {
  options: string[]
  choice: string
}

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

function answerSpaceOf(question: GeneratedQuestion, catalog: ProgressionCatalog): AnswerSpace | null {
  const key = pitchClassOf(question.key)
  if (key === null) return null
  const numeral = question.numeral ?? ''
  const progression = question.progression === undefined ? undefined : catalog[question.progression]
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
      return KEY_NUMERALS.includes(numeral) ? { identify: (o) => (KEY_NUMERALS.includes(o) ? o : null), right: numeral } : null
    case 'chord_to_function': {
      const fn = NUMERAL_FUNCTION[numeral]
      const functions = ['tonic', 'subdominant', 'dominant']
      return fn ? { identify: (o) => (functions.includes(o) ? o : null), right: fn } : null
    }
    case 'numbers_to_chart': {
      const chart = progression ? chartOf(key, progression.bars) : null
      if (!chart) return null
      const charts = new Set(Object.values(catalog).flatMap(({ bars }) => {
        const c = chartOf(key, bars)
        return c ? [chartSymbol(c)] : []
      }))
      const asChart = (option: string) => {
        const chords = option.split(' ').map((s) => parseChord(s, true))
        if (chords.some((c) => c === null)) return null
        const symbol = chords.map((c) => (c ? chordSymbol(c) : '')).join(' ')
        return charts.has(symbol) ? symbol : null
      }
      return { identify: asChart, right: chartSymbol(chart) }
    }
    case 'chart_to_numbers':
    case 'progression_by_number':
      return progression && question.progression !== undefined
        ? { identify: (o) => (o in catalog ? o : null), right: question.progression }
        : null
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
  const values = answer.options.map(space.identify)
  if (values.some((v) => v === null) || new Set(values).size !== values.length || !values.includes(space.right)) return null
  const picked = answer.options.indexOf(answer.choice)
  if (picked < 0) return null
  if (question.way === 'function_to_chord' && !oneChordWithTheFunction(question, values as string[])) return null
  return values[picked] === space.right
}

/** Whether the asked chord is the only option with its function. */
function oneChordWithTheFunction(question: GeneratedQuestion, chords: string[]): boolean {
  const key = pitchClassOf(question.key)
  if (key === null) return false
  const numerals = chordsOfTheKey(key)
  const asked = NUMERAL_FUNCTION[question.numeral ?? '']
  return chords.filter((symbol) => NUMERAL_FUNCTION[numerals.get(symbol) ?? ''] === asked).length === 1
}
