import { describe, expect, it } from 'vitest'

import type { PlayAlongParams } from '@/spikes/practice/model'
import { nextBpm, startingBpm } from '@/spikes/practice/tempoLadder'

const params: PlayAlongParams = {
  start_bpm: 70,
  target_bpm: 120,
  step_bpm: 5,
  cleans_to_advance: 2,
  loops: 4,
  count_in_beats: 4,
}

describe('nextBpm', () => {
  it('starts where the student left off when there are no takes yet', () => {
    expect(nextBpm(params, [], 70)).toBe(70)
  })

  it('stays after a single clean take', () => {
    expect(nextBpm(params, [{ bpm: 70, rating: 'clean' }], 70)).toBe(70)
  })

  it('goes up a step after enough clean takes in a row at the same tempo', () => {
    const takes = [
      { bpm: 70, rating: 'clean' as const },
      { bpm: 70, rating: 'clean' as const },
    ]
    expect(nextBpm(params, takes, 70)).toBe(75)
  })

  it('does not count clean takes from the previous tempo', () => {
    const takes = [
      { bpm: 70, rating: 'clean' as const },
      { bpm: 70, rating: 'clean' as const },
      { bpm: 75, rating: 'clean' as const },
    ]
    expect(nextBpm(params, takes, 70)).toBe(75)
  })

  it('stays after an "almost"', () => {
    expect(nextBpm(params, [{ bpm: 80, rating: 'almost' }], 70)).toBe(80)
  })

  it('goes down a step after a struggle', () => {
    expect(nextBpm(params, [{ bpm: 80, rating: 'struggled' }], 70)).toBe(75)
  })

  it('never passes the target', () => {
    const takes = [
      { bpm: 120, rating: 'clean' as const },
      { bpm: 120, rating: 'clean' as const },
    ]
    expect(nextBpm(params, takes, 70)).toBe(120)
  })

  it('never drops below 40 BPM', () => {
    expect(nextBpm({ ...params, start_bpm: 40 }, [{ bpm: 40, rating: 'struggled' }], 40)).toBe(40)
  })
})

describe('startingBpm', () => {
  it('starts at the item start with no clean take on record', () => {
    expect(startingBpm(params, null)).toBe(70)
  })

  it("starts at the best clean tempo — warming up is the warm-up block's job", () => {
    expect(startingBpm(params, 100)).toBe(100)
  })

  it('never starts below the item start or above the target', () => {
    expect(startingBpm(params, 65)).toBe(70)
    expect(startingBpm(params, 140)).toBe(120)
  })
})
