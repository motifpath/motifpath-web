/** Keep text in CSS-sized coordinates, allowing only the board to overflow. */
export function readableBoardGeometry(availableWidth: number, fretSpan: number, stringCount: number, includesNut = false) {
  const left = includesNut ? 26 : 4
  const right = 4
  // A nut target and the first fret's centered target must remain separate.
  const minimumGap = includesNut ? 88 : 48
  const width = Math.max(availableWidth, fretSpan * minimumGap + left + right)
  const columnGap = (width - left - right) / fretSpan
  return { width, left, right, columnGap, rowGap: 44, height: Math.max(1, stringCount - 1) * 44 }
}
