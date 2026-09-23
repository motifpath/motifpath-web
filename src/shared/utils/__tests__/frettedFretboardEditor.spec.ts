import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MAX_FRET,
  DEFAULT_MIN_FRET,
  EDITOR_MARGIN_LEFT,
  EDITOR_MARGIN_RIGHT,
  EDITOR_PX_PER_FRET,
  editorBoardWidth,
  editorViewWidth,
  frettedEditorGeometry,
  fretX,
  nearestFrettedCell,
  positionX,
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

describe('editorBoardWidth / editorViewWidth', () => {
  it('grows the board with the fret range, at a fixed pixel width per fret', () => {
    const narrow = frettedEditorGeometry(6, 0, 12)
    const wide = frettedEditorGeometry(6, 0, 24)

    expect(editorBoardWidth(narrow)).toBeCloseTo(EDITOR_PX_PER_FRET * 12)
    expect(editorBoardWidth(wide)).toBeCloseTo(EDITOR_PX_PER_FRET * 24)
    expect(editorViewWidth(wide)).toBeCloseTo(editorBoardWidth(wide) + EDITOR_MARGIN_LEFT + EDITOR_MARGIN_RIGHT)
  })

  it('matches the min-w-[1106px] floor FrettedDiagramEditor.vue hardcodes for the default range', () => {
    // Tailwind's arbitrary-value classes can't be computed at runtime, so that class is a
    // literal pixel value — this guards it against drifting out of sync with the geometry
    // constants it's derived from.
    expect(editorViewWidth(frettedEditorGeometry(6))).toBe(1106)
  })
})

describe('fretX / stringY', () => {
  const geometry = frettedEditorGeometry(6)

  it('places the lowest fret at the left margin', () => {
    expect(fretX(geometry.minFret, geometry)).toBeCloseTo(44)
  })

  it('places the highest fret at the right edge of the board', () => {
    expect(fretX(geometry.maxFret, geometry)).toBeCloseTo(EDITOR_MARGIN_LEFT + editorBoardWidth(geometry))
  })

  it('places string 1 (highest-pitched) at the top of the board', () => {
    expect(stringY(1, geometry)).toBeCloseTo(34)
  })

  it('places the highest-numbered string (lowest-pitched) at the bottom', () => {
    expect(stringY(geometry.stringCount, geometry)).toBeCloseTo(260)
  })
})

describe('positionX', () => {
  const geometry = frettedEditorGeometry(6)

  it('places a fretted position in the middle of its fret space, never on the fret wire', () => {
    const midpoint = (fretX(4, geometry) + fretX(5, geometry)) / 2

    expect(positionX(5, geometry)).toBeCloseTo(midpoint)
    expect(positionX(5, geometry)).not.toBeCloseTo(fretX(5, geometry))
  })

  it('places an open-string (fret 0) position to the left of the nut', () => {
    const halfGap = fretX(1, geometry) - fretX(0, geometry)

    expect(positionX(0, geometry)).toBeCloseTo(fretX(0, geometry) - halfGap / 2)
  })
})

describe('nearestFrettedCell', () => {
  const geometry = frettedEditorGeometry(6)

  it('resolves a click at a marker\'s own drawn position back to that exact string/fret', () => {
    const cell = nearestFrettedCell(positionX(5, geometry), stringY(3, geometry), geometry)

    expect(cell).toEqual({ string: 3, fret: 5 })
  })

  it('resolves any click within a fret\'s visual space to that fret, not the nearer wire', () => {
    // Just right of the fret-4/fret-5 wire — visually inside fret 5's space, closer to wire 5,
    // but the whole space up to wire 5 belongs to fret 5, not fret 4.
    const px = fretX(4, geometry) + 2
    const cell = nearestFrettedCell(px, stringY(3, geometry), geometry)

    expect(cell).toEqual({ string: 3, fret: 5 })
  })

  it('resolves a click just past a fret wire to the next fret\'s space', () => {
    const px = fretX(5, geometry) + 2
    const cell = nearestFrettedCell(px, stringY(3, geometry), geometry)

    expect(cell).toEqual({ string: 3, fret: 6 })
  })

  it('treats the open-string zone left of the nut as fret 0', () => {
    const cell = nearestFrettedCell(positionX(0, geometry), stringY(3, geometry), geometry)

    expect(cell).toEqual({ string: 3, fret: 0 })
  })

  it('returns null for a click left of the open-string zone', () => {
    const cell = nearestFrettedCell(fretX(geometry.minFret, geometry) - 100, stringY(1, geometry), geometry)

    expect(cell).toBeNull()
  })

  it('returns null for a click past the highest playable fret', () => {
    const cell = nearestFrettedCell(fretX(geometry.maxFret, geometry) + 100, stringY(1, geometry), geometry)

    expect(cell).toBeNull()
  })

  it('returns null for a click above string 1 (past the top edge)', () => {
    const cell = nearestFrettedCell(fretX(5, geometry), stringY(1, geometry) - 100, geometry)

    expect(cell).toBeNull()
  })

  it('returns null for a click below the highest-numbered string (past the bottom edge)', () => {
    const cell = nearestFrettedCell(fretX(5, geometry), stringY(geometry.stringCount, geometry) + 100, geometry)

    expect(cell).toBeNull()
  })
})
