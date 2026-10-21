/**
 * The tour of a progression key tour item: the progression played key after key around the cycle
 * of fourths, with one tempo for the whole tour. Keys come first, then tempo:
 *
 * - a take rated clean at or above the tour tempo makes its key clean, and the next take is in the
 *   next key of the cycle not yet clean, at the same tempo;
 * - an almost take, or a clean one slower than the tour tempo, stays in the key;
 * - a struggle at or below the tour tempo stays in the key, one step slower, never below the floor;
 *   a struggle above it, at a tempo the student chose, is exploring and changes nothing;
 * - when the last key is made clean, the tour starts again at C, one step faster, never past the
 *   target by itself.
 *
 * The tour tempo is kept at effective speed (quarter-note BPM), so takes in any note value compare.
 * The server folds the same rules from the takes it records; the next session starts where they
 * left the tour.
 */
import { TEMPO_STEP_BPM } from '@/shared/utils/sequence'
import { effectiveSpeed, speedFactor } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'
import type { components } from '@/api/generated/core-domain'
import type { TakeRating } from '@/features/student/utils/tempoLadder'

type Tour = components['schemas']['PlannedProgressionKeys']
type MusicKey = components['schemas']['MusicKey']

/** The tour's order: the cycle of fourths from C, spelled as the chord catalog spells roots. */
export const TOUR_ORDER: readonly MusicKey[] = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G']

/** Keys of the cycle shown on each side of the current one. */
const WINDOW_SIDE = 2

/** Where a tour stands: the key the next take is in, its tempo at effective speed, its clean keys in tour order. */
export interface TourState {
  key: MusicKey
  speed: number
  clean: MusicKey[]
}

/** A take of the tour, as rated: its tempo as played, in its note value (quarters when it says none). */
export interface TourTake {
  rating: TakeRating
  bpm: number
  noteValue?: TempoNoteValue
}

/** Where the tour starts in a session: the planned key and tempo, and the keys the plan says are clean. */
export function tourStart(tour: Tour): TourState {
  return {
    key: tour.start_music_key,
    // The plan rounds the tour tempo up into its note value, so this is never slower than the server's.
    speed: effectiveSpeed(tour.tour_tempo_bpm, tour.start_note_value),
    clean: tour.keys.filter((k) => k.clean).map((k) => k.music_key),
  }
}

/** Where the tour stands after `take`, in `state.key`. */
export function afterTake(state: TourState, take: TourTake, limits: { target: number; min: number }): TourState {
  const speed = effectiveSpeed(take.bpm, take.noteValue ?? 'quarters')
  if (take.rating === 'struggled') {
    if (speed > state.speed) return state
    return { ...state, speed: Math.max(limits.min, state.speed - TEMPO_STEP_BPM) }
  }
  if (take.rating === 'almost' || speed < state.speed || state.clean.includes(state.key)) return state

  const clean = inTourOrder([...state.clean, state.key])
  if (clean.length === TOUR_ORDER.length) {
    return { key: TOUR_ORDER[0]!, speed: Math.max(state.speed, Math.min(state.speed + TEMPO_STEP_BPM, limits.target)), clean: [] }
  }
  return { ...state, key: nextKey(state.key, clean), clean }
}

/** The tour tempo played in `noteValue`, rounded up so a take at it is never slower than the tour. */
export function tourTempoIn(state: TourState, noteValue: TempoNoteValue): number {
  return Math.ceil(state.speed / speedFactor(noteValue))
}

/** Five keys of the cycle around `key`, wrapping around. */
export function tourWindow(key: MusicKey): MusicKey[] {
  const at = indexOf(key)
  return Array.from({ length: WINDOW_SIDE * 2 + 1 }, (_, i) => TOUR_ORDER[(at - WINDOW_SIDE + i + TOUR_ORDER.length) % TOUR_ORDER.length]!)
}

/** The next key after `key` in the cycle that isn't clean. */
function nextKey(key: MusicKey, clean: MusicKey[]): MusicKey {
  const at = indexOf(key)
  for (let step = 1; step <= TOUR_ORDER.length; step++) {
    const candidate = TOUR_ORDER[(at + step) % TOUR_ORDER.length]!
    if (!clean.includes(candidate)) return candidate
  }
  return TOUR_ORDER[0]!
}

function indexOf(key: MusicKey): number {
  return Math.max(0, TOUR_ORDER.indexOf(key))
}

function inTourOrder(keys: MusicKey[]): MusicKey[] {
  return [...keys].sort((a, b) => indexOf(a) - indexOf(b))
}
