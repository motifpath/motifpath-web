/**
 * The tempo ladder of a play-along item: two clean takes in a row at
 * a tempo move it up a step, a struggle moves it down one, anything else holds.
 * It stays between the item's floor and its target, unless the student chose to play faster,
 * and never goes below a tempo the student chose: only the student lowers that.
 *
 * A take is played at a note value (quarters when it says none). The steps move the played BPM
 * within the note value of the next take, while the target, the floor and a chosen tempo compare
 * effective speed: 60 BPM in eighths is the 120 BPM target in quarters.
 */
import { MIN_TEMPO_BPM, TEMPO_STEP_BPM } from '@/shared/utils/sequence'
import { effectiveSpeed, speedFactor } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

export { TEMPO_STEP_BPM }
/** Clean takes in a row at one tempo that move the ladder up. */
const CLEANS_TO_ADVANCE = 2
/** The share of the target a first session starts at, as core composes it. */
const FIRST_START_SHARE = 0.6

export type TakeRating = 'struggled' | 'almost' | 'clean'

/** A tempo as played: its BPM in its note value, quarters when it says none. */
export interface PlayedTempo {
  bpm: number
  noteValue?: TempoNoteValue
}

export interface RatedTake extends PlayedTempo {
  rating: TakeRating
}

/** A tempo's speed in quarter-note BPM, which is how tempos in different note values compare. */
export function speedOf(tempo: PlayedTempo): number {
  return effectiveSpeed(tempo.bpm, tempo.noteValue ?? 'quarters')
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

/** The ladder's floor played in `noteValue`: the same effective speed, never below the slowest playable tempo. */
export function ladderFloorIn(target: number, noteValue: TempoNoteValue): number {
  return Math.max(MIN_TEMPO_BPM, Math.ceil(ladderFloor(target) / speedFactor(noteValue)))
}

/**
 * The tempo of the next take, played in `item.noteValue`, given this item's takes so far, oldest
 * first, and the tempo the student last chose for it, if any. The ladder never climbs past the
 * target by itself, but a take the student chose to play faster than the target holds its tempo.
 * A struggle steps down, but never below the tempo the student chose.
 */
export function nextTempo(
  item: { start: number; target: number; noteValue?: TempoNoteValue; chosen?: PlayedTempo | null },
  takes: RatedTake[],
): number {
  const noteValue = item.noteValue ?? 'quarters'
  const factor = speedFactor(noteValue)
  /** A tempo played in this note value, in whole BPM. */
  const inThisValue = (tempo: PlayedTempo) => Math.floor(speedOf(tempo) / factor)

  const last = takes.at(-1)
  const lastBpm = last ? inThisValue(last) : null
  const targetBpm = Math.floor(item.target / factor)
  const ceiling = Math.max(targetBpm, lastBpm ?? targetBpm)
  const chosenFloor = item.chosen ? Math.ceil(speedOf(item.chosen) / factor) : 0
  const floor = Math.max(ladderFloorIn(item.target, noteValue), chosenFloor)
  const clamp = (bpm: number) => Math.min(ceiling, Math.max(floor, bpm))
  if (!last || lastBpm === null) return clamp(item.start)
  if (last.rating === 'struggled') return clamp(lastBpm - TEMPO_STEP_BPM)
  if (last.rating === 'almost' || speedOf(last) >= item.target) return clamp(lastBpm)

  const sameTempo = (take: RatedTake) => take.bpm === last.bpm && (take.noteValue ?? 'quarters') === (last.noteValue ?? 'quarters')
  let cleanRun = 0
  for (let i = takes.length - 1; i >= 0 && sameTempo(takes[i]!) && takes[i]!.rating === 'clean'; i--) cleanRun++
  return clamp(cleanRun >= CLEANS_TO_ADVANCE ? Math.min(targetBpm, lastBpm + TEMPO_STEP_BPM) : lastBpm)
}
