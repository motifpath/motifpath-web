/** A horizontal stretch of the board, in its own pixels. */
export interface Span {
  from: number
  to: number
}

/**
 * Where a scrolling board should scroll to keep what's sounding in view while
 * it plays, or null to stay put. It shows the next note too when both fit, so
 * a player sees where to go before they get there. Moving ahead, what sounds
 * goes to the window's leading edge, leaving the most room for what follows;
 * moving back, to its trailing edge. `margin` keeps air around both.
 */
export function followScrollLeft(
  view: { left: number; width: number; contentWidth: number; margin: number },
  sounding: Span,
  next: Span | null,
): number | null {
  const { left, width, contentWidth, margin } = view
  const maxLeft = contentWidth - width
  if (maxLeft <= 0) return null

  const both = next && { from: Math.min(sounding.from, next.from), to: Math.max(sounding.to, next.to) }
  const target = both && both.to - both.from + 2 * margin <= width ? both : sounding

  let wanted: number
  if (target.from - margin < left) wanted = target.to + margin - width
  else if (target.to + margin > left + width) wanted = target.from - margin
  else return null
  return Math.min(maxLeft, Math.max(0, wanted))
}
