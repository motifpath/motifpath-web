import { describe, expect, it } from 'vitest'

import { findTheNoteCells, P1_ITEMS, P2_ITEMS } from '@/spikes/commit-point/items'

/** A seeded generator, so a test sees the same board every time. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32
    return state / 2 ** 32
  }
}

describe('find-the-note cells for P3', () => {
  const cells = findTheNoteCells(30, seeded(7))

  it('makes as many as asked, on the six strings from the open string to fret 11', () => {
    expect(cells).toHaveLength(30)
    for (const cell of cells) {
      expect(cell.string).toBeGreaterThanOrEqual(1)
      expect(cell.string).toBeLessThanOrEqual(6)
      expect(cell.fret).toBeGreaterThanOrEqual(0)
      expect(cell.fret).toBeLessThanOrEqual(11)
    }
  })

  it('never asks the same cell twice in a row', () => {
    for (let index = 1; index < cells.length; index++) expect(cells[index]).not.toEqual(cells[index - 1])
  })
})

describe('the fixed items', () => {
  it('gives every P1 audio item exactly one right option, as the tap is its answer', () => {
    for (const item of P1_ITEMS) expect(item.options.filter((option) => option.is_correct)).toHaveLength(1)
  })

  it('gives every P2 item more than one right option, as it is a MultipleChoice', () => {
    for (const item of P2_ITEMS) expect(item.options.filter((option) => option.is_correct).length).toBeGreaterThan(1)
  })

  it('names a clip for every P1 item', () => {
    for (const item of P1_ITEMS) expect(item.tones.length).toBeGreaterThan(0)
  })
})
