/**
 * The note value a piece is played at: a speed factor on the music as written, over a click that
 * stays on the beat. Eighths play the music twice as fast as written, halves half as fast. A
 * tempo is kept as played (80 BPM in eighths stays 80) and compared at its effective speed, the
 * BPM times the factor in quarter-note BPM, so 80 in eighths counts as 160.
 */
import type { components } from '@/api/generated/core-domain'
import { TEMPO_STEP_BPM } from '@/shared/utils/sequence'

export type TempoNoteValue = components['schemas']['practice_NoteValue']

const FACTORS: Record<TempoNoteValue, number> = {
  halves: 0.5,
  quarters: 1,
  eighths: 2,
  triplets: 3,
  sixteenths: 4,
  quintuplets: 5,
  sextuplets: 6,
  thirty_seconds: 8,
}

/** Every note value, from the slowest to the fastest: what the Metronome tool offers. */
export const ALL_NOTE_VALUES: readonly TempoNoteValue[] = [
  'halves',
  'quarters',
  'eighths',
  'triplets',
  'sixteenths',
  'quintuplets',
  'sextuplets',
  'thirty_seconds',
]

/** The values offered where a student plays music: exercises, drills and lessons. */
export const SUGGESTED_NOTE_VALUES: readonly TempoNoteValue[] = ['quarters', 'eighths', 'triplets', 'sixteenths']

/** How many times faster than written the music plays; in a click with no music, the clicks a beat. */
export function speedFactor(value: TempoNoteValue): number {
  return FACTORS[value]
}

/** A tempo's speed in quarter-note BPM, which is how tempos played in different values compare. */
export function effectiveSpeed(bpm: number, value: TempoNoteValue): number {
  return bpm * speedFactor(value)
}

/** The tempo in `to` with the same effective speed as `bpm` in `from`, rounded down to the 5 BPM grid. */
export function keepEffectiveSpeed(bpm: number, from: TempoNoteValue, to: TempoNoteValue): number {
  const exact = effectiveSpeed(bpm, from) / speedFactor(to)
  return Math.floor(exact / TEMPO_STEP_BPM) * TEMPO_STEP_BPM
}
