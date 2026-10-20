import { describe, expect, it } from 'vitest'

import { starPolygonPoints } from '@/shared/utils/diagramMarkerShapes'

describe('starPolygonPoints', () => {
  it('returns 10 comma-separated x,y pairs (5-pointed star)', () => {
    const points = starPolygonPoints(100, 50, 14, 6)

    const pairs = points.trim().split(' ')
    expect(pairs).toHaveLength(10)
    pairs.forEach((pair) => expect(pair).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/))
  })

  it('centers the star on (cx, cy) — the topmost outer point sits directly above center', () => {
    const points = starPolygonPoints(100, 50, 14, 6)
    const [firstX, firstY] = points.trim().split(' ')[0]!.split(',').map(Number)

    expect(firstX).toBeCloseTo(100)
    expect(firstY).toBeCloseTo(50 - 14)
  })
})
