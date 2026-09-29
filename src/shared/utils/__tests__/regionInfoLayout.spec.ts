import { describe, expect, it } from 'vitest'

import {
  CONTROL_SIZE,
  anchorDescription,
  insetOverlappingOutlines,
  placeRegionControls,
  railWidthFor,
} from '@/shared/utils/regionInfoLayout'

describe('placeRegionControls', () => {
  it('centres a lone control just inside its region’s last fret', () => {
    const [control] = placeRegionControls([{ id: 'a', right: 300 }], 600)

    expect(control).toEqual({ id: 'a', center: 300 - CONTROL_SIZE / 2 })
  })

  it('places controls of regions ending on the same fret side by side, the last at the fret', () => {
    const controls = placeRegionControls(
      [
        { id: 'a', right: 300 },
        { id: 'b', right: 300 },
        { id: 'c', right: 300 },
      ],
      600,
    )

    const centers = controls.map((control) => control.center).sort((a, b) => a - b)
    expect(centers.at(-1)).toBe(300 - CONTROL_SIZE / 2)
    for (let index = 1; index < centers.length; index++) {
      expect(centers[index]! - centers[index - 1]!).toBeGreaterThanOrEqual(CONTROL_SIZE)
    }
  })

  it('keeps every control within the rail, pushing crowded ones right of the left edge', () => {
    const controls = placeRegionControls(
      [
        { id: 'a', right: 20 },
        { id: 'b', right: 30 },
      ],
      600,
    )

    const centers = controls.map((control) => control.center).sort((a, b) => a - b)
    expect(centers[0]).toBeGreaterThanOrEqual(CONTROL_SIZE / 2)
    expect(centers[1]! - centers[0]!).toBeGreaterThanOrEqual(CONTROL_SIZE)
  })

  it('never lets a control pass the right edge of the rail', () => {
    const [control] = placeRegionControls([{ id: 'a', right: 700 }], 600)

    expect(control!.center + CONTROL_SIZE / 2).toBeLessThanOrEqual(600)
  })

  it('returns controls in the order the regions were given', () => {
    const controls = placeRegionControls(
      [
        { id: 'late', right: 400 },
        { id: 'early', right: 100 },
      ],
      600,
    )

    expect(controls.map((control) => control.id)).toEqual(['late', 'early'])
  })
})

describe('railWidthFor', () => {
  it('asks for room for every control side by side', () => {
    expect(railWidthFor(0)).toBe(0)
    expect(railWidthFor(10)).toBeGreaterThanOrEqual(10 * CONTROL_SIZE)
  })
})

describe('insetOverlappingOutlines', () => {
  const box = (x: number, width: number) => ({ x, y: 0, width, height: 200 })

  it('leaves a region that overlaps nothing at its own edges', () => {
    expect(insetOverlappingOutlines([box(0, 100), box(200, 100)])).toEqual([box(0, 100), box(200, 100)])
  })

  it('draws a later region overlapping an earlier one as a parallel line inside it', () => {
    const [first, second] = insetOverlappingOutlines([box(0, 100), box(0, 100)])

    expect(first).toEqual(box(0, 100))
    expect(second!.x).toBeGreaterThan(first!.x)
    expect(second!.x + second!.width).toBeLessThan(first!.x + first!.width)
  })

  it('insets each further overlapping region one step further', () => {
    const [, second, third] = insetOverlappingOutlines([box(0, 100), box(0, 100), box(0, 100)])

    expect(third!.x).toBeGreaterThan(second!.x)
  })

  it('never insets a small region past a third of its size', () => {
    const outlines = insetOverlappingOutlines([box(0, 12), box(0, 12), box(0, 12), box(0, 12)])

    for (const outline of outlines) expect(outline.width).toBeGreaterThan(0)
  })
})

describe('anchorDescription', () => {
  it('ends the description at its control when there is room, pointing at the control', () => {
    const placement = anchorDescription({ controlCenter: 400, width: 200, scrollLeft: 0, visibleWidth: 600 })

    expect(placement.left + placement.width).toBeGreaterThan(400)
    expect(placement.left + placement.arrow).toBeCloseTo(400)
  })

  it('stays within the visible part of a scrolled board', () => {
    const placement = anchorDescription({ controlCenter: 1180, width: 248, scrollLeft: 900, visibleWidth: 320 })

    expect(placement.left).toBeGreaterThanOrEqual(900)
    expect(placement.left + placement.width).toBeLessThanOrEqual(900 + 320)
  })

  it('shrinks to fit a board narrower than its usual width', () => {
    const placement = anchorDescription({ controlCenter: 100, width: 248, scrollLeft: 0, visibleWidth: 200 })

    expect(placement.width).toBeLessThanOrEqual(200)
    expect(placement.left).toBeGreaterThanOrEqual(0)
  })
})
