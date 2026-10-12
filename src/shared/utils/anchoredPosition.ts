export interface AnchorRect {
  left: number
  top: number
  right: number
  bottom: number
}

export type AnchoredPosition = { top?: string; bottom?: string; left?: string; right?: string }

const GAP = 8

/**
 * Where a menu opens next to its trigger: below it, or above it when the trigger sits in the lower
 * half of the window, and aligned to the trigger's edge on the side of the window it is on.
 */
export function anchoredPosition(rect: AnchorRect, viewport: { width: number; height: number }): AnchoredPosition {
  const vertical =
    rect.top > viewport.height / 2 ? { bottom: `${viewport.height - rect.top + GAP}px` } : { top: `${rect.bottom + GAP}px` }
  const horizontal =
    rect.left > viewport.width / 2 ? { right: `${viewport.width - rect.right}px` } : { left: `${rect.left}px` }
  return { ...vertical, ...horizontal }
}
