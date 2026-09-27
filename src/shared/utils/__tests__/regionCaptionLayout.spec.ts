import { describe, expect, it } from 'vitest'

import { captionTextWidth, layoutRegionCaptions } from '@/shared/utils/regionCaptionLayout'

const MAX_X = 720

describe('layoutRegionCaptions', () => {
  it('needs no lanes when there are no captions', () => {
    expect(layoutRegionCaptions([], MAX_X)).toEqual({ placements: [], laneCount: 0 })
  })

  it('keeps captions of bands far apart on one lane', () => {
    const { placements, laneCount } = layoutRegionCaptions(
      [
        { left: 40, right: 200, text: 'Box 1' },
        { left: 300, right: 500, text: 'Box 2' },
      ],
      MAX_X,
    )

    expect(laneCount).toBe(1)
    expect(placements.map((p) => p.lane)).toEqual([0, 0])
  })

  it('puts captions of bands that start at the same fret on separate lanes', () => {
    const { placements, laneCount } = layoutRegionCaptions(
      [
        { left: 300, right: 600, text: 'Positions 1 and 2' },
        { left: 300, right: 450, text: 'Shape 1' },
      ],
      MAX_X,
    )

    expect(laneCount).toBe(2)
    expect(placements[0]!.lane).not.toBe(placements[1]!.lane)
  })

  it("moves a caption to another lane when a neighbour's text runs past its own band into it", () => {
    const longText = 'C Major Scale — Open Position'
    const { placements } = layoutRegionCaptions(
      [
        { left: 40, right: 100, text: longText },
        { left: 110, right: 200, text: 'Shape 1' },
      ],
      MAX_X,
    )

    expect(40 + captionTextWidth(longText)).toBeGreaterThan(110)
    expect(placements[1]!.lane).not.toBe(placements[0]!.lane)
  })

  it('uses as few lanes as the overlaps allow, reusing a freed lane', () => {
    const { placements, laneCount } = layoutRegionCaptions(
      [
        { left: 40, right: 250, text: 'A' },
        { left: 400, right: 600, text: 'B' },
        { left: 200, right: 450, text: 'C' },
      ],
      MAX_X,
    )

    expect(laneCount).toBe(2)
    expect(placements[0]!.lane).toBe(placements[1]!.lane)
    expect(placements[2]!.lane).not.toBe(placements[0]!.lane)
  })

  it("starts a caption just inside its band's left edge", () => {
    const { placements } = layoutRegionCaptions([{ left: 300, right: 500, text: 'Box' }], MAX_X)

    expect(placements[0]!.textX).toBeGreaterThan(300)
    expect(placements[0]!.textX).toBeLessThan(310)
  })

  it('shifts a caption left so it ends inside the drawing, never past its right edge', () => {
    const text = 'A Minor Pentatonic — Positions 1 and 2'
    const { placements } = layoutRegionCaptions([{ left: 600, right: 700, text }], MAX_X)

    expect(placements[0]!.textX + captionTextWidth(text)).toBeLessThanOrEqual(MAX_X)
  })
})
