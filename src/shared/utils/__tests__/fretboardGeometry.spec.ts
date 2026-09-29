import { describe, expect, it } from 'vitest'

import {
  MIN_COLUMN_GAP,
  MIN_COLUMN_GAP_WITH_NUT,
  ROW_GAP,
  fretLineX,
  fretboardGeometry,
  markerCenterX,
  regionBandBox,
  stringLineY,
  stringThicknesses,
} from '@/shared/utils/fretboardGeometry'
import type { BoardFrame } from '@/shared/utils/fretboardGeometry'

describe('fretboardGeometry', () => {
  it('fills the available width when every fret space fits at its minimum width', () => {
    const geometry = fretboardGeometry({ availableWidth: 600, fretSpan: 4, stringCount: 6, showsNut: false })

    expect(geometry.width).toBe(600)
    expect(geometry.left + geometry.columnGap * 4 + geometry.right).toBeCloseTo(600)
  })

  it('keeps a fret space wide enough for a touch target, growing wider than the screen instead', () => {
    const geometry = fretboardGeometry({ availableWidth: 320, fretSpan: 12, stringCount: 6, showsNut: false })

    expect(geometry.columnGap).toBe(MIN_COLUMN_GAP)
    expect(MIN_COLUMN_GAP).toBeGreaterThanOrEqual(44)
    expect(geometry.width).toBeGreaterThan(320)
  })

  it('widens every fret space when the nut shows, so an open-string target and a fret-1 target never overlap', () => {
    const geometry = fretboardGeometry({ availableWidth: 200, fretSpan: 3, stringCount: 6, showsNut: true })

    // An open marker sits on the nut; a fret-1 marker sits mid-space: half a column apart.
    expect(geometry.columnGap / 2).toBeGreaterThanOrEqual(44)
    expect(geometry.columnGap).toBe(MIN_COLUMN_GAP_WITH_NUT)
  })

  it('leaves room left of the nut for a whole open-string marker', () => {
    const withNut = fretboardGeometry({ availableWidth: 600, fretSpan: 3, stringCount: 6, showsNut: true })
    const withoutNut = fretboardGeometry({ availableWidth: 600, fretSpan: 3, stringCount: 6, showsNut: false })

    expect(withNut.left).toBeGreaterThanOrEqual(22)
    expect(withoutNut.left).toBeLessThan(withNut.left)
  })

  it('spaces strings a touch target apart', () => {
    const geometry = fretboardGeometry({ availableWidth: 600, fretSpan: 4, stringCount: 6, showsNut: false })

    expect(ROW_GAP).toBeGreaterThanOrEqual(44)
    expect(geometry.rowGap).toBe(ROW_GAP)
    expect(geometry.boardHeight).toBe(5 * ROW_GAP)
  })
})

describe('stringThicknesses', () => {
  it('draws strings thicker as their open pitch gets lower', () => {
    // Lowest string first, as an instrument's tuning lists them; string 1 is the last entry.
    const widths = stringThicknesses(['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], 6)

    // widths[i] is string i + 1's thickness.
    expect(Math.max(...widths)).toBe(widths[5])
    expect(Math.min(...widths)).toBe(widths[0])
    for (let string = 1; string < 6; string++) {
      expect(widths[string]!).toBeGreaterThan(widths[string - 1]!)
    }
  })

  it('follows pitch rather than string order in a re-entrant tuning', () => {
    const widths = stringThicknesses(['G4', 'C4', 'E4', 'A4'], 4)

    const [a4, e4, c4, g4] = widths
    expect(Math.max(...widths)).toBe(c4)
    expect(g4!).toBeLessThanOrEqual(c4!)
    expect(e4!).toBeGreaterThan(a4!)
  })

  it('draws every string alike when the instrument has no tuning', () => {
    const widths = stringThicknesses(undefined, 5)

    expect(widths).toHaveLength(5)
    expect(new Set(widths).size).toBe(1)
  })
})

describe('board frame placement', () => {
  const frame: BoardFrame = { minFret: 4, maxFret: 8, stringCount: 6, left: 10, columnGap: 50, rowGap: 44, top: 30 }

  it("puts the window's lowest fret wire at the board's left edge, one column per fret after it", () => {
    expect(fretLineX(frame, 4)).toBe(10)
    expect(fretLineX(frame, 8)).toBe(210)
  })

  it('centres a fretted marker in its fret space, behind its fret wire', () => {
    expect(markerCenterX(frame, 5)).toBe(35)
  })

  it('centres an open-string marker on the nut', () => {
    const open: BoardFrame = { ...frame, minFret: 0 }

    expect(markerCenterX(open, 0)).toBe(fretLineX(open, 0))
  })

  it('draws string 1 at the top, one row gap per string below it', () => {
    expect(stringLineY(frame, 1)).toBe(30)
    expect(stringLineY(frame, 6)).toBe(30 + 5 * 44)
  })

  it("bands a region's whole fret spaces, half a string gap beyond its outer strings", () => {
    expect(regionBandBox(frame, { fretStart: 5, fretEnd: 7, stringStart: 2, stringEnd: 4 })).toEqual({
      x: 10,
      y: 30 + 44 - 22,
      width: 150,
      height: 2 * 44 + 44,
    })
  })

  it('starts a band from fret 0 at the nut, leaving the open-string area bare', () => {
    const open: BoardFrame = { ...frame, minFret: 0 }

    expect(regionBandBox(open, { fretStart: 0, fretEnd: 2, stringStart: 1, stringEnd: 6 }).x).toBe(fretLineX(open, 0))
  })

  it('surrounds the nut with a band of only the open strings, covering their markers', () => {
    const open: BoardFrame = { ...frame, minFret: 0 }
    const box = regionBandBox(open, { fretStart: 0, fretEnd: 0, stringStart: 1, stringEnd: 6 })

    expect(box.x).toBeLessThan(fretLineX(open, 0) - 18)
    expect(box.x + box.width).toBeGreaterThan(fretLineX(open, 0) + 18)
  })
})
