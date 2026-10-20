import { describe, expect, it } from 'vitest'

import { fretWindowRange, inFretWindow, windowBoardFrets } from '@/shared/utils/fretWindow'

describe('fretWindowRange', () => {
  it('covers the open string and frets 1 to 5 when it starts at the nut', () => {
    expect(fretWindowRange(0)).toEqual({ from: 0, to: 5 })
  })

  it('covers five frets from any other first fret', () => {
    expect(fretWindowRange(3)).toEqual({ from: 3, to: 7 })
  })

  it('ends at fret 11, the last fret a cell can be on', () => {
    expect(fretWindowRange(7)).toEqual({ from: 7, to: 11 })
  })
})

describe('inFretWindow', () => {
  it('holds the frets from its first to its last, both included', () => {
    const range = fretWindowRange(3)
    expect([2, 3, 7, 8].map((fret) => inFretWindow(range, fret))).toEqual([false, true, true, false])
  })

  it('holds the open string when it starts at the nut', () => {
    expect(inFretWindow(fretWindowRange(0), 0)).toBe(true)
  })
})

describe('windowBoardFrets', () => {
  it('draws from the nut when the window starts there', () => {
    expect(windowBoardFrets(fretWindowRange(0))).toEqual({ minFret: 0, maxFret: 5 })
  })

  it('draws from the fret line left of its first fret otherwise', () => {
    expect(windowBoardFrets(fretWindowRange(3))).toEqual({ minFret: 2, maxFret: 7 })
  })
})
