import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MAX_FRET,
  DEFAULT_MIN_FRET,
  frettedEditorGeometry,
  fretX,
  nearestFrettedCell,
  stringY,
} from '@/shared/utils/frettedFretboardEditor'

describe('frettedEditorGeometry', () => {
  it('defaults to a full-neck fret range regardless of any diagram content', () => {
    const geometry = frettedEditorGeometry(6)

    expect(geometry.minFret).toBe(DEFAULT_MIN_FRET)
    expect(geometry.maxFret).toBe(DEFAULT_MAX_FRET)
    expect(geometry.stringCount).toBe(6)
  })

  it('accepts an explicit fret range override', () => {
    const geometry = frettedEditorGeometry(6, 0, 20)

    expect(geometry.minFret).toBe(0)
    expect(geometry.maxFret).toBe(20)
  })
})

describe('fretX / stringY', () => {
  const geometry = frettedEditorGeometry(6)

  it('places the lowest fret at the left margin', () => {
    expect(fretX(geometry.minFret, geometry)).toBeCloseTo(44)
  })

  it('places the highest fret at the right edge of the board', () => {
    expect(fretX(geometry.maxFret, geometry)).toBeCloseTo(690)
  })

  it('places the highest-numbered string (lowest-pitched) at the top', () => {
    expect(stringY(geometry.stringCount, geometry)).toBeCloseTo(34)
  })

  it('places string 1 (highest-pitched) at the bottom of the board', () => {
    expect(stringY(1, geometry)).toBeCloseTo(260)
  })
})

describe('nearestFrettedCell', () => {
  const geometry = frettedEditorGeometry(6)

  it('inverts fretX/stringY back to the exact string/fret it came from', () => {
    const cell = nearestFrettedCell(fretX(5, geometry), stringY(3, geometry), geometry)

    expect(cell).toEqual({ string: 3, fret: 5 })
  })

  it('snaps a click that lands between two cells to the nearest one', () => {
    const px = fretX(5, geometry) + 2
    const py = stringY(3, geometry) - 2

    const cell = nearestFrettedCell(px, py, geometry)

    expect(cell).toEqual({ string: 3, fret: 5 })
  })

  it('returns null for a click left of the lowest playable fret', () => {
    const cell = nearestFrettedCell(fretX(geometry.minFret, geometry) - 100, stringY(1, geometry), geometry)

    expect(cell).toBeNull()
  })

  it('returns null for a click past the highest playable fret', () => {
    const cell = nearestFrettedCell(fretX(geometry.maxFret, geometry) + 100, stringY(1, geometry), geometry)

    expect(cell).toBeNull()
  })

  it('returns null for a click above the highest-numbered string (past the top edge)', () => {
    const cell = nearestFrettedCell(fretX(5, geometry), stringY(geometry.stringCount, geometry) - 100, geometry)

    expect(cell).toBeNull()
  })

  it('returns null for a click below string 1 (past the bottom edge)', () => {
    const cell = nearestFrettedCell(fretX(5, geometry), stringY(1, geometry) + 100, geometry)

    expect(cell).toBeNull()
  })
})
