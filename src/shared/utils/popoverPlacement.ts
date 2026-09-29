/**
 * Where a popover drawn over the page (fixed, in viewport pixels) goes next to its anchor: just
 * below it and aligned with its left edge, kept inside the screen sideways, and flipped above it
 * when it doesn't fit below but does above. When it fits on neither side it stays below, so its
 * top — where its heading and close control are — is never cut off.
 */
const GAP = 4
const MARGIN = 8

export function popoverPlacement(input: {
  anchor: { left: number; top: number; bottom: number }
  width: number
  height: number
  viewportWidth: number
  viewportHeight: number
}): { left: number; top: number } {
  const { anchor, width, height, viewportWidth, viewportHeight } = input
  const left = Math.max(MARGIN, Math.min(anchor.left, viewportWidth - width - MARGIN))
  const below = anchor.bottom + GAP
  const above = anchor.top - GAP - height
  const fitsBelow = below + height <= viewportHeight - MARGIN
  const fitsAbove = above >= MARGIN
  return { left, top: !fitsBelow && fitsAbove ? above : below }
}
