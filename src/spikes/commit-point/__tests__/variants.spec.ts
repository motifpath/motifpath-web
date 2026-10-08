import { describe, expect, it } from 'vitest'

import { advanceDelayMs, boardSetup, classifyTap, commitsOnSelection, replayHoldsAdvance, showsRightCount } from '@/spikes/commit-point/variants'

const GUITAR = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

describe('P1 · when an audio item moves on after its feedback', () => {
  it('A moves a right answer on after 900 ms, as the session does today', () => {
    expect(advanceDelayMs('A', true)).toBe(900)
  })

  it('B never moves on by itself: the student presses Next', () => {
    expect(advanceDelayMs('B', true)).toBeNull()
  })

  it('C holds a right answer for 2.5 s, visibly', () => {
    expect(advanceDelayMs('C', true)).toBe(2500)
  })

  it('no variant moves a wrong answer on by itself', () => {
    for (const variant of ['A', 'B', 'C'] as const) expect(advanceDelayMs(variant, false)).toBeNull()
  })

  it('only C lets a replay stop the countdown', () => {
    expect(replayHoldsAdvance('A')).toBe(false)
    expect(replayHoldsAdvance('B')).toBe(false)
    expect(replayHoldsAdvance('C')).toBe(true)
  })
})

describe('P2 · when a MultipleChoice answer is committed', () => {
  it('A and C wait for Check, however many options are chosen', () => {
    expect(commitsOnSelection('A', 3, 3)).toBe(false)
    expect(commitsOnSelection('C', 3, 3)).toBe(false)
  })

  it('B commits as soon as the chosen count reaches the right count', () => {
    expect(commitsOnSelection('B', 2, 3)).toBe(false)
    expect(commitsOnSelection('B', 3, 3)).toBe(true)
  })

  it('B and C tell the student how many to choose; A does not, as today', () => {
    expect(showsRightCount('A')).toBe(false)
    expect(showsRightCount('B')).toBe(true)
    expect(showsRightCount('C')).toBe(true)
  })
})

describe('P3 · how the find-the-note board takes a tap', () => {
  it('A fits the board and takes taps on the asked string only, as today', () => {
    expect(boardSetup('A')).toEqual({ anyStringCounts: false, minColumnPx: null })
  })

  it('B fits the board and counts a tap on any string as the asked one', () => {
    expect(boardSetup('B')).toEqual({ anyStringCounts: true, minColumnPx: null })
  })

  it('C keeps 48 px fret columns and scrolls sideways', () => {
    expect(boardSetup('C')).toEqual({ anyStringCounts: false, minColumnPx: 48 })
  })
})

describe('classifying a find-the-note tap', () => {
  const asked = { string: 2, fret: 5 }

  it('is right on the asked cell', () => {
    expect(classifyTap(GUITAR, asked, { string: 2, fret: 5 })).toBe('right')
  })

  it('is right on the same note an octave up the same string', () => {
    expect(classifyTap(GUITAR, { string: 2, fret: 0 }, { string: 2, fret: 12 })).toBe('right')
  })

  it('is a mis-tap one fret either side', () => {
    expect(classifyTap(GUITAR, asked, { string: 2, fret: 4 })).toBe('adjacent')
    expect(classifyTap(GUITAR, asked, { string: 2, fret: 6 })).toBe('adjacent')
  })

  it('is wrong further away', () => {
    expect(classifyTap(GUITAR, asked, { string: 2, fret: 8 })).toBe('wrong')
  })
})
