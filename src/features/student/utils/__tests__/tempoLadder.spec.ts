import { describe, expect, it } from 'vitest'

import { ladderFloor, nextTempo } from '@/features/student/utils/tempoLadder'
import type { RatedTake } from '@/features/student/utils/tempoLadder'

const item = { start: 80, target: 100 }

function takes(...pairs: [number, RatedTake['rating']][]): RatedTake[] {
  return pairs.map(([bpm, rating]) => ({ bpm, rating }))
}

describe('ladderFloor', () => {
  it('is 60% of the target, rounded down to 5 BPM', () => {
    expect(ladderFloor(100)).toBe(60)
    expect(ladderFloor(123)).toBe(70)
  })

  it('never goes below the slowest playable tempo', () => {
    expect(ladderFloor(30)).toBe(20)
  })

  it('never goes above the target', () => {
    expect(ladderFloor(20)).toBe(20)
  })
})

describe('nextTempo', () => {
  it('starts at the start tempo', () => {
    expect(nextTempo(item, [])).toBe(80)
  })

  it('holds after one clean take', () => {
    expect(nextTempo(item, takes([80, 'clean']))).toBe(80)
  })

  it('goes up 5 BPM after two clean takes in a row at the tempo', () => {
    expect(nextTempo(item, takes([80, 'clean'], [80, 'clean']))).toBe(85)
  })

  it('needs two clean takes again at the new tempo', () => {
    expect(nextTempo(item, takes([80, 'clean'], [80, 'clean'], [85, 'clean']))).toBe(85)
  })

  it('does not count clean takes broken by another rating', () => {
    expect(nextTempo(item, takes([80, 'clean'], [80, 'almost'], [80, 'clean']))).toBe(80)
  })

  it('holds after an almost', () => {
    expect(nextTempo(item, takes([80, 'almost']))).toBe(80)
  })

  it('goes down 5 BPM after a struggle, below the start tempo', () => {
    expect(nextTempo(item, takes([80, 'struggled']))).toBe(75)
  })

  it('never goes below the floor', () => {
    expect(nextTempo(item, takes([60, 'struggled']))).toBe(60)
  })

  it('never goes above the target', () => {
    expect(nextTempo(item, takes([100, 'clean'], [100, 'clean']))).toBe(100)
  })

  it('holds a tempo the student set above the target after two clean takes', () => {
    expect(nextTempo(item, takes([110, 'clean'], [110, 'clean']))).toBe(110)
  })

  it('holds a tempo the student set above the target after an almost', () => {
    expect(nextTempo(item, takes([110, 'almost']))).toBe(110)
  })

  it('never lowers a tempo the student chose, struggles included', () => {
    expect(nextTempo({ ...item, chosen: 180 }, takes([180, 'struggled'], [180, 'struggled']))).toBe(180)
  })

  it('still steps down above a tempo the student chose, but only as far as it', () => {
    const chosenBelowTarget = { ...item, chosen: 70 }
    expect(nextTempo(chosenBelowTarget, takes([70, 'clean'], [70, 'clean']))).toBe(75)
    expect(nextTempo(chosenBelowTarget, takes([70, 'clean'], [70, 'clean'], [75, 'struggled']))).toBe(70)
  })
})
