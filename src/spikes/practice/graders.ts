/**
 * Grading: a raw response plus the item it answers → the evidence payload to
 * store, or a rejection. Each grader is named with its version so stored
 * evidence says which rules graded it, and a rule change can regrade the raw
 * responses kept alongside. Answer keys come from reference data, never from
 * the client.
 */
import { frettedPitch, parsePitch } from '@/shared/utils/pitch'
import type {
  GraderId,
  ItemKind,
  PracticeItem,
  PracticeResponse,
  Rating,
} from '@/spikes/practice/model'

export interface GradeContext {
  /** An instrument's tuning, lowest string first; null when unknown. */
  tuningOf: (instrumentId: string) => string[] | null
  /** An exercise's options and which of them are correct; null when unknown. */
  exerciseKey: (exerciseId: string) => { option_ids: string[]; correct_option_ids: string[] } | null
}

export type Graded =
  | { source: 'auto_graded'; correct: boolean; latency_ms: number }
  | {
      source: 'self_assessed'
      rating: Rating
      bpm: number | null
      changes_per_minute: number | null
    }

export type Rejection =
  | 'response_does_not_fit_item'
  | 'unknown_option'
  | 'unknown_reference'
  | 'measure_missing'
  | 'invalid_latency'

export type GradeResult = { grader: GraderId; graded: Graded } | { rejected: Rejection }

interface Grader {
  name: string
  item_kinds: ItemKind[]
  grade(item: PracticeItem, response: PracticeResponse, ctx: GradeContext): Graded | Rejection
}

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12
/** A bare note name in any spelling ("F#", "Gb") as a pitch class; null if not a note. */
const noteClass = (name: string) => {
  const midi = parsePitch(`${name}4`)
  return midi === null ? null : pitchClass(midi)
}

const validLatency = (ms: number) => Number.isFinite(ms) && ms >= 0

export const GRADERS: Record<GraderId, Grader> = {
  'fretboard_cell.v1': {
    name: 'fretboard_cell',
    item_kinds: ['fretboard_cell'],
    grade(item, response, ctx) {
      if (item.kind !== 'fretboard_cell') return 'response_does_not_fit_item'
      if (response.kind !== 'name_the_note' && response.kind !== 'find_the_note')
        return 'response_does_not_fit_item'
      if (!validLatency(response.latency_ms)) return 'invalid_latency'
      const tuning = ctx.tuningOf(item.instrument_id)
      const expected = tuning && frettedPitch(tuning, item.string, item.fret)
      if (expected === null || expected === undefined) return 'unknown_reference'
      let correct: boolean
      if (response.kind === 'name_the_note') {
        correct = noteClass(response.chosen_note) === pitchClass(expected)
      } else {
        // Any octave counts, but only on the string asked about.
        const tapped = frettedPitch(tuning!, response.string, response.fret)
        correct =
          response.string === item.string &&
          tapped !== null &&
          pitchClass(tapped) === pitchClass(expected)
      }
      return { source: 'auto_graded', correct, latency_ms: response.latency_ms }
    },
  },
  'exercise_option.v1': {
    name: 'exercise_option',
    item_kinds: ['exercise'],
    grade(item, response, ctx) {
      if (item.kind !== 'exercise' || response.kind !== 'option_choice')
        return 'response_does_not_fit_item'
      if (!validLatency(response.latency_ms)) return 'invalid_latency'
      const key = ctx.exerciseKey(item.exercise_id)
      if (key === null) return 'unknown_reference'
      if (!key.option_ids.includes(response.option_id)) return 'unknown_option'
      return {
        source: 'auto_graded',
        correct: key.correct_option_ids.includes(response.option_id),
        latency_ms: response.latency_ms,
      }
    },
  },
  'self_rating.v1': {
    name: 'self_rating',
    item_kinds: ['play_along', 'chord_change'],
    grade(item, response) {
      if (response.kind !== 'self_rating') return 'response_does_not_fit_item'
      if (item.kind === 'play_along' && response.bpm === null) return 'measure_missing'
      if (item.kind === 'chord_change' && response.changes_per_minute === null)
        return 'measure_missing'
      if (item.kind !== 'play_along' && item.kind !== 'chord_change')
        return 'response_does_not_fit_item'
      return {
        source: 'self_assessed',
        rating: response.rating,
        bpm: response.bpm,
        changes_per_minute: response.changes_per_minute,
      }
    },
  },
}

/** The grader for an item kind: exactly one per kind. */
export function graderFor(kind: ItemKind): GraderId {
  return (Object.keys(GRADERS) as GraderId[]).find((id) => GRADERS[id].item_kinds.includes(kind))!
}

export function grade(
  item: PracticeItem,
  response: PracticeResponse,
  ctx: GradeContext,
): GradeResult {
  const grader = graderFor(item.kind)
  const result = GRADERS[grader].grade(item, response, ctx)
  return typeof result === 'string' ? { rejected: result } : { grader, graded: result }
}
