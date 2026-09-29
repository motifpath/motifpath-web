/**
 * Rhythm arithmetic for a diagram's playback steps. Lengths are exact
 * fractions of a whole note (1/4 a quarter, 3/8 a dotted quarter, 1/12 an
 * eighth-note triplet), so bars add up with no rounding.
 */
import type { components } from '@/api/generated/core-domain'

type NoteValue = components['schemas']['NoteValue']
type SequenceStep = components['schemas']['SequenceStep']
type TimeSignature = components['schemas']['TimeSignature']

/** The tempo range a diagram, or a usage overriding it, may play at. */
export const MIN_TEMPO_BPM = 20
export const MAX_TEMPO_BPM = 300

/** Whether a tempo is a whole number of beats per minute within the allowed range. */
export function isValidTempoBpm(bpm: number): boolean {
  return Number.isInteger(bpm) && bpm >= MIN_TEMPO_BPM && bpm <= MAX_TEMPO_BPM
}

/** The plain note lengths an author picks from: 1 a whole note … 32 a thirty-second. */
export const BASE_NOTE_VALUES = [1, 2, 4, 8, 16, 32] as const
export type BaseNoteValue = (typeof BASE_NOTE_VALUES)[number]

/**
 * n notes in the time of m of the same written length. A sextuplet isn't
 * offered: six sixteenths in a quarter last exactly as long as sixteenth
 * triplets, so the stored length couldn't tell them apart.
 */
export const TUPLETS = { 3: 2, 5: 4 } as const
export type Tuplet = keyof typeof TUPLETS

export interface NoteValueParts {
  base: BaseNoteValue
  dotted: boolean
  tuplet: Tuplet | null
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function reduce(num: number, den: number): NoteValue {
  const divisor = gcd(num, den)
  return { num: num / divisor, den: den / divisor }
}

function add(a: NoteValue, b: NoteValue): NoteValue {
  return reduce(a.num * b.den + b.num * a.den, a.den * b.den)
}

/** Whether a is shorter than b. */
function lessThan(a: NoteValue, b: NoteValue): boolean {
  return a.num * b.den < b.num * a.den
}

/** How many whole bars of `bar` fit in `time`. */
function wholeBars(time: NoteValue, bar: NoteValue): number {
  return Math.floor((time.num * bar.den) / (time.den * bar.num))
}

export function sameNoteValue(a: NoteValue, b: NoteValue): boolean {
  return !lessThan(a, b) && !lessThan(b, a)
}

/** Meters of 6, 9, 12 or 15 beats of a quarter or shorter count in dotted beats. */
function isCompound(signature: TimeSignature): boolean {
  return [6, 9, 12, 15].includes(signature.beats) && signature.beat_value >= 4
}

/** What one beat of the tempo is: a dotted beat in a compound meter, the written beat otherwise. */
export function pulse(signature: TimeSignature): NoteValue {
  return isCompound(signature) ? reduce(3, signature.beat_value) : { num: 1, den: signature.beat_value }
}

/** The length of a written note, dotted (half as long again) or as one note of a tuplet. */
export function noteValue(base: BaseNoteValue, options: { dotted?: boolean; tuplet?: Tuplet | null } = {}): NoteValue {
  if (options.tuplet) return reduce(TUPLETS[options.tuplet], options.tuplet * base)
  return options.dotted ? reduce(3, base * 2) : { num: 1, den: base }
}

/** The written note a length is, or null when no single note, dot or tuplet writes it. */
export function describeNoteValue(value: NoteValue): NoteValueParts | null {
  for (const base of BASE_NOTE_VALUES) {
    if (sameNoteValue(value, noteValue(base))) return { base, dotted: false, tuplet: null }
    if (sameNoteValue(value, noteValue(base, { dotted: true }))) return { base, dotted: true, tuplet: null }
  }
  for (const base of BASE_NOTE_VALUES) {
    for (const tuplet of [3, 5] as const) {
      if (sameNoteValue(value, noteValue(base, { tuplet }))) return { base, dotted: false, tuplet }
    }
  }
  return null
}

/**
 * For each step, whether it starts in a later bar than the step before it —
 * where a bar line is drawn. A note that crosses a bar line puts the line
 * before the next step.
 */
export function barStarts(steps: SequenceStep[], signature: TimeSignature): boolean[] {
  const bar = reduce(signature.beats, signature.beat_value)
  let time: NoteValue = { num: 0, den: 1 }
  let previousBar = 0
  return steps.map((step) => {
    const currentBar = wholeBars(time, bar)
    const starts = currentBar > previousBar
    previousBar = currentBar
    time = add(time, step.value)
    return starts
  })
}
