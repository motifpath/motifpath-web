/**
 * When each note of a diagram's sequence sounds. `playbackSteps` settles what
 * each step plays — its positions' pitches, in strum order — independent of
 * tempo; `buildTimeline` then lays the steps out in seconds, from any step, so
 * a tempo change can re-time the rest of a run without touching what already
 * sounded.
 */
import type { components } from '@/api/generated/core-domain'
import { pulse } from '@/shared/utils/sequence'

type SequenceStep = components['schemas']['SequenceStep']
type TimeSignature = components['schemas']['TimeSignature']

export type PlaybackDirection = 'as_authored' | 'reversed'

export interface PlaybackNote {
  positionId: string
  midi: number
  /** Seconds after the step's start: 0 unless the step is strummed. */
  offset: number
}

export interface PlaybackStep {
  /** The step's length as a fraction of a whole note. */
  value: number
  /** The positions that sound, which light up while the step lasts; empty for a rest. */
  positionIds: string[]
  notes: PlaybackNote[]
}

export interface ScheduledNote {
  positionId: string
  midi: number
  /** Seconds, on whatever clock `startAt` is given in. */
  time: number
  duration: number
  stepIndex: number
}

export interface StepSpan {
  stepIndex: number
  start: number
  end: number
  positionIds: string[]
}

export interface Timeline {
  notes: ScheduledNote[]
  spans: StepSpan[]
  /** When the last laid-out step ends. */
  end: number
}

/** How long a whole note lasts at `bpm` beats a minute, where a beat is the signature's pulse. */
export function secondsPerWhole(bpm: number, timeSignature: TimeSignature): number {
  const beat = pulse(timeSignature)
  return 60 / bpm / (beat.num / beat.den)
}

/**
 * What each step plays, in playing order. A step's positions sound in
 * ascending pitch; a down-strum starts the lowest on the beat and each next
 * one `strumSeconds` later, an up-strum the highest first. Reversed plays the
 * steps last to first, each keeping its own value and strum. A position with
 * no pitch (not a position of the diagram) is left out.
 */
export function playbackSteps(
  sequence: SequenceStep[],
  pitchOf: (positionId: string) => number | null,
  options: { direction: PlaybackDirection; strumSeconds: number },
): PlaybackStep[] {
  const ordered = options.direction === 'reversed' ? [...sequence].reverse() : sequence
  return ordered.map((step) => {
    const voices = step.position_ids
      .map((positionId) => ({ positionId, midi: pitchOf(positionId) }))
      .filter((voice): voice is { positionId: string; midi: number } => voice.midi !== null)
      .sort((a, b) => a.midi - b.midi)
    if (step.strum === 'up') voices.reverse()
    const strummed = step.strum !== 'none'
    return {
      value: step.value.num / step.value.den,
      positionIds: voices.map((voice) => voice.positionId),
      notes: voices.map((voice, i) => ({ ...voice, offset: strummed ? i * options.strumSeconds : 0 })),
    }
  })
}

/**
 * Lays `steps` out end to end, from step `from` starting at `startAt`, with a
 * whole note lasting `wholeSeconds`. Each note holds until its step ends.
 */
export function buildTimeline(
  steps: PlaybackStep[],
  wholeSeconds: number,
  options: { from?: number; startAt?: number } = {},
): Timeline {
  const { from = 0, startAt = 0 } = options
  const notes: ScheduledNote[] = []
  const spans: StepSpan[] = []
  let time = startAt
  for (let stepIndex = from; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex]!
    const length = step.value * wholeSeconds
    for (const note of step.notes) {
      notes.push({
        positionId: note.positionId,
        midi: note.midi,
        time: time + note.offset,
        duration: length - note.offset,
        stepIndex,
      })
    }
    spans.push({ stepIndex, start: time, end: time + length, positionIds: step.positionIds })
    time += length
  }
  return { notes, spans, end: time }
}
