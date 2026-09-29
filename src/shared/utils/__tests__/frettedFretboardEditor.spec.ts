import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MAX_FRET,
  DEFAULT_MIN_FRET,
  editorRegionBox,
  frettedEditorLayout,
  isDrawableRegion,
  nearestFrettedCell,
} from '@/shared/utils/frettedFretboardEditor'
import {
  MIN_COLUMN_GAP_WITH_NUT,
  ROW_GAP,
  TARGET_RADIUS,
  fretLineX,
  fretboardGeometry,
  markerCenterX,
  regionBandBox,
  stringLineY,
} from '@/shared/utils/fretboardGeometry'

describe('frettedEditorLayout', () => {
  it('spans the whole neck regardless of any diagram content, so any fret can be placed', () => {
    const { frame } = frettedEditorLayout(6, 800)

    expect(frame.minFret).toBe(DEFAULT_MIN_FRET)
    expect(frame.maxFret).toBe(DEFAULT_MAX_FRET)
    expect(DEFAULT_MAX_FRET).toBe(24)
    expect(frame.stringCount).toBe(6)
  })

  it("spaces frets and strings as a student's board does", () => {
    const layout = frettedEditorLayout(6, 800)
    const student = fretboardGeometry({ availableWidth: 800, fretSpan: 24, stringCount: 6, showsNut: true })

    expect(layout.frame.columnGap).toBe(student.columnGap)
    expect(layout.frame.columnGap).toBe(MIN_COLUMN_GAP_WITH_NUT)
    expect(layout.frame.rowGap).toBe(ROW_GAP)
    expect(layout.frame.left).toBe(student.left)
    expect(layout.width).toBe(student.width)
  })

  it('grows wider than a narrow container, for it to scroll, and fills a wide one', () => {
    expect(frettedEditorLayout(6, 360).width).toBeGreaterThan(360)
    expect(frettedEditorLayout(6, 4000).width).toBe(4000)
  })

  it('makes room above string 1 for the wood and below the last string for the fret numbers', () => {
    const { frame, height } = frettedEditorLayout(6, 800)

    expect(stringLineY(frame, 1) - ROW_GAP / 2).toBeGreaterThanOrEqual(0)
    expect(height - stringLineY(frame, 6)).toBeGreaterThanOrEqual(ROW_GAP / 2 + 22)
  })

  it('accepts an explicit fret range override', () => {
    const { frame } = frettedEditorLayout(4, 800, 3, 12)

    expect(frame.minFret).toBe(3)
    expect(frame.maxFret).toBe(12)
  })
})

describe('nearestFrettedCell', () => {
  const { frame } = frettedEditorLayout(6, 800)

  it("resolves a click at a marker's own drawn position back to that exact string/fret", () => {
    expect(nearestFrettedCell(markerCenterX(frame, 5), stringLineY(frame, 3), frame)).toEqual({ string: 3, fret: 5 })
  })

  it("resolves any click within a fret's visual space to that fret, not the nearer wire", () => {
    expect(nearestFrettedCell(fretLineX(frame, 4) + 2, stringLineY(frame, 3), frame)).toEqual({ string: 3, fret: 5 })
  })

  it("resolves a click just past a fret wire to the next fret's space", () => {
    expect(nearestFrettedCell(fretLineX(frame, 5) + 2, stringLineY(frame, 3), frame)).toEqual({ string: 3, fret: 6 })
  })

  it("treats a click anywhere on an open-string marker's touch target as fret 0", () => {
    for (const offset of [-TARGET_RADIUS, 0, TARGET_RADIUS - 1]) {
      expect(nearestFrettedCell(fretLineX(frame, 0) + offset, stringLineY(frame, 3), frame)).toEqual({ string: 3, fret: 0 })
    }
  })

  it("still gives fret 1 the whole of its marker's touch target, just past the nut", () => {
    const targetLeftEdge = markerCenterX(frame, 1) - TARGET_RADIUS + 1

    expect(nearestFrettedCell(targetLeftEdge, stringLineY(frame, 3), frame)).toEqual({ string: 3, fret: 1 })
  })

  it('resolves a click between two strings to the nearer one', () => {
    expect(nearestFrettedCell(markerCenterX(frame, 5), stringLineY(frame, 3) + ROW_GAP / 2 - 1, frame)).toEqual({ string: 3, fret: 5 })
  })

  it('returns null for a click left of the open-string zone', () => {
    expect(nearestFrettedCell(fretLineX(frame, 0) - TARGET_RADIUS - 2, stringLineY(frame, 1), frame)).toBeNull()
  })

  it('returns null for a click past the highest playable fret', () => {
    expect(nearestFrettedCell(fretLineX(frame, frame.maxFret) + 10, stringLineY(frame, 1), frame)).toBeNull()
  })

  it('returns null for a click above string 1 or below the last string', () => {
    expect(nearestFrettedCell(markerCenterX(frame, 5), stringLineY(frame, 1) - ROW_GAP, frame)).toBeNull()
    expect(nearestFrettedCell(markerCenterX(frame, 5), stringLineY(frame, 6) + ROW_GAP, frame)).toBeNull()
  })
})

describe('editor regions', () => {
  const { frame } = frettedEditorLayout(6, 800)
  const region = { fretStart: 5, fretEnd: 8, stringStart: 2, stringEnd: 4 }

  it("draws a region's band exactly where a student's board does", () => {
    expect(editorRegionBox(region, frame)).toEqual(regionBandBox(frame, region))
  })

  it('covers every string when a region has no string limits', () => {
    expect(editorRegionBox({ ...region, stringStart: null, stringEnd: null }, frame)).toEqual(
      regionBandBox(frame, { ...region, stringStart: 1, stringEnd: 6 }),
    )
  })

  it("can't draw a region that runs backwards, off the neck or past the last string", () => {
    expect(isDrawableRegion(region, frame)).toBe(true)
    expect(isDrawableRegion({ ...region, fretStart: 9 }, frame)).toBe(false)
    expect(isDrawableRegion({ ...region, fretEnd: 25 }, frame)).toBe(false)
    expect(isDrawableRegion({ ...region, stringEnd: 7 }, frame)).toBe(false)
    expect(isDrawableRegion({ ...region, stringStart: null }, frame)).toBe(false)
  })
})
