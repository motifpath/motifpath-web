import { describe, expect, it } from 'vitest'

import { followScrollLeft } from '@/shared/utils/followScroll'

// A 300 px window onto a 1000 px board, keeping 30 px of air around what it follows.
const view = { left: 0, width: 300, contentWidth: 1000, margin: 30 }

describe('followScrollLeft', () => {
  it('stays put while the sounding and next notes are in view', () => {
    expect(followScrollLeft(view, { from: 100, to: 120 }, { from: 200, to: 220 })).toBeNull()
  })

  it('moves ahead to show the sounding note and the next one, the sounding one first', () => {
    expect(followScrollLeft(view, { from: 250, to: 290 }, { from: 400, to: 420 })).toBe(220)
  })

  it('moves back to a sounding note behind the window, the next one with it', () => {
    expect(followScrollLeft({ ...view, left: 500 }, { from: 300, to: 320 }, { from: 200, to: 220 })).toBe(50)
  })

  it('follows the sounding note alone when the next one is too far to show with it', () => {
    expect(followScrollLeft(view, { from: 500, to: 520 }, { from: 900, to: 920 })).toBe(470)
  })

  it('follows the sounding note when there is no next one', () => {
    expect(followScrollLeft(view, { from: 500, to: 520 }, null)).toBe(470)
  })

  it('never scrolls past either end of the board', () => {
    expect(followScrollLeft(view, { from: 980, to: 1000 }, null)).toBe(700)
    expect(followScrollLeft({ ...view, left: 400 }, { from: 10, to: 20 }, null)).toBe(0)
  })

  it('stays put on a board that fits its window', () => {
    expect(followScrollLeft({ ...view, contentWidth: 300 }, { from: 250, to: 290 }, null)).toBeNull()
  })
})
