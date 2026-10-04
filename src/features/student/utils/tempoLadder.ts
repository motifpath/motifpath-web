/**
 * The tempo ladder of a play-along item (ADR-046): two clean takes in a row at
 * a tempo move it up a step, a struggle moves it down one, anything else holds.
 * It stays between the item's floor and its target.
 */
import { MIN_TEMPO_BPM } from '@/shared/utils/sequence'

export const TEMPO_STEP_BPM = 5
/** Clean takes in a row at one tempo that move the ladder up. */
const CLEANS_TO_ADVANCE = 2
/** The share of the target a first session starts at, as core composes it. */
const FIRST_START_SHARE = 0.6

export type TakeRating = 'struggled' | 'almost' | 'clean'

export interface RatedTake {
  bpm: number
  rating: TakeRating
}

/**
 * The slowest the ladder goes: the tempo a student with no clean take starts at
 * (60% of the target, rounded down to 5 BPM). Lower than a best clean tempo, so
 * a struggle at the student's best can still step down.
 */
export function ladderFloor(target: number): number {
  const start = Math.floor((target * FIRST_START_SHARE) / TEMPO_STEP_BPM) * TEMPO_STEP_BPM
  return Math.min(target, Math.max(MIN_TEMPO_BPM, start))
}

/** The tempo of the next take, given this item's takes so far, oldest first. */
export function nextTempo(item: { start: number; target: number }, takes: RatedTake[]): number {
  const clamp = (bpm: number) => Math.min(item.target, Math.max(ladderFloor(item.target), bpm))
  const last = takes.at(-1)
  if (!last) return clamp(item.start)
  if (last.rating === 'struggled') return clamp(last.bpm - TEMPO_STEP_BPM)
  if (last.rating === 'almost') return clamp(last.bpm)

  let cleanRun = 0
  for (let i = takes.length - 1; i >= 0 && takes[i]!.bpm === last.bpm && takes[i]!.rating === 'clean'; i--) cleanRun++
  return clamp(cleanRun >= CLEANS_TO_ADVANCE ? last.bpm + TEMPO_STEP_BPM : last.bpm)
}
