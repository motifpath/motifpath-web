import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'

import { buildTimeline, playbackSteps, secondsPerWhole } from '../timeline'

type SequenceStep = components['schemas']['SequenceStep']

const PITCHES: Record<string, number> = { a: 45, b: 52, c: 57, d: 60 }
const pitchOf = (id: string) => PITCHES[id] ?? null

function step(positionIds: string[], num: number, den: number, strum: SequenceStep['strum'] = 'none'): SequenceStep {
  return { position_ids: positionIds, value: { num, den }, strum }
}

const asAuthored = { direction: 'as_authored', strumSeconds: 0.02 } as const

describe('secondsPerWhole', () => {
  it('a quarter-note pulse at 60 BPM makes a whole note four seconds', () => {
    expect(secondsPerWhole(60, { beats: 4, beat_value: 4 })).toBeCloseTo(4)
  })

  it('counts a half-note pulse in 2/2', () => {
    expect(secondsPerWhole(60, { beats: 2, beat_value: 2 })).toBeCloseTo(2)
  })

  it('counts a dotted-quarter pulse in 6/8, so at 60 BPM a dotted quarter lasts a second', () => {
    expect((3 / 8) * secondsPerWhole(60, { beats: 6, beat_value: 8 })).toBeCloseTo(1)
  })
})

describe('playbackSteps', () => {
  it('keeps each step with its value as a fraction of a whole note', () => {
    const steps = playbackSteps([step(['a'], 1, 8), step(['d'], 3, 8)], pitchOf, asAuthored)
    expect(steps.map((s) => s.value)).toEqual([1 / 8, 3 / 8])
    expect(steps.map((s) => s.positionIds)).toEqual([['a'], ['d']])
  })

  it('a rest takes its time but sounds nothing', () => {
    const [rest] = playbackSteps([step([], 1, 4)], pitchOf, asAuthored)
    expect(rest).toEqual({ value: 1 / 4, positionIds: [], notes: [] })
  })

  it('an unstrummed chord sounds together, in ascending pitch', () => {
    const [chord] = playbackSteps([step(['c', 'a', 'b'], 1, 4)], pitchOf, asAuthored)
    expect(chord!.notes).toEqual([
      { positionId: 'a', midi: 45, offset: 0 },
      { positionId: 'b', midi: 52, offset: 0 },
      { positionId: 'c', midi: 57, offset: 0 },
    ])
  })

  it('a down-strum starts the lowest pitch on the beat and spreads the rest', () => {
    const [chord] = playbackSteps([step(['c', 'a', 'b'], 1, 4, 'down')], pitchOf, asAuthored)
    expect(chord!.notes.map((n) => [n.midi, n.offset])).toEqual([
      [45, 0],
      [52, 0.02],
      [57, 0.04],
    ])
  })

  it('an up-strum starts the highest pitch on the beat', () => {
    const [chord] = playbackSteps([step(['a', 'b', 'c'], 1, 4, 'up')], pitchOf, asAuthored)
    expect(chord!.notes.map((n) => [n.midi, n.offset])).toEqual([
      [57, 0],
      [52, 0.02],
      [45, 0.04],
    ])
  })

  it('reversed plays the steps last to first, each keeping its own value and strum', () => {
    const steps = playbackSteps(
      [step(['a'], 1, 8), step(['b', 'c'], 1, 4, 'up')],
      pitchOf,
      { ...asAuthored, direction: 'reversed' },
    )
    expect(steps.map((s) => s.value)).toEqual([1 / 4, 1 / 8])
    expect(steps[0]!.notes.map((n) => [n.midi, n.offset])).toEqual([
      [57, 0],
      [52, 0.02],
    ])
  })

  it('a position can sound in several steps (strum a chord, then arpeggiate it)', () => {
    const steps = playbackSteps([step(['a', 'b'], 1, 4, 'down'), step(['a'], 1, 8)], pitchOf, asAuthored)
    expect(steps.map((s) => s.positionIds)).toEqual([['a', 'b'], ['a']])
  })

  it('leaves out a position it has no pitch for', () => {
    const [chord] = playbackSteps([step(['a', 'gone'], 1, 4)], pitchOf, asAuthored)
    expect(chord!.positionIds).toEqual(['a'])
    expect(chord!.notes).toHaveLength(1)
  })
})

describe('buildTimeline', () => {
  const steps = playbackSteps(
    [step(['a'], 1, 4), step([], 1, 8), step(['b', 'c'], 1, 4, 'down')],
    pitchOf,
    asAuthored,
  )

  it('lays the steps end to end at the tempo', () => {
    const timeline = buildTimeline(steps, 4)
    expect(timeline.spans.map((s) => [s.start, s.end])).toEqual([
      [0, 1],
      [1, 1.5],
      [1.5, 2.5],
    ])
    expect(timeline.end).toBeCloseTo(2.5)
  })

  it('starts each note at its step plus its strum offset, holding it to the end of the step', () => {
    const notes = buildTimeline(steps, 4).notes
    expect(notes.map((n) => [n.positionId, n.time, n.duration, n.stepIndex])).toEqual([
      ['a', 0, 1, 0],
      ['b', 1.5, 1, 2],
      ['c', 1.52, 0.98, 2],
    ])
  })

  it('can start from a later step at a given time, keeping the step indices', () => {
    const timeline = buildTimeline(steps, 2, { from: 2, startAt: 10 })
    expect(timeline.spans).toEqual([{ stepIndex: 2, start: 10, end: 10.5, positionIds: ['b', 'c'] }])
    expect(timeline.notes.map((n) => [n.time, n.stepIndex])).toEqual([
      [10, 2],
      [10.02, 2],
    ])
  })
})
