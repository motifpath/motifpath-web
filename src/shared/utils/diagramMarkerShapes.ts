/**
 * SVG `<polygon>` points for a 5-pointed star centered on (cx, cy), used by
 * both the diagram editor and the read-only viewer so a "star" position
 * marker renders identically in each. The dot (circle) and square shapes
 * need no shared geometry — plain SVG primitives cover them directly.
 */
export function starPolygonPoints(cx: number, cy: number, outerRadius: number, innerRadius: number): string {
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}
