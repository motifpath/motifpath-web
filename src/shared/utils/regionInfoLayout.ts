/**
 * Where a fretboard's region information controls and descriptions go. Each
 * region gets one control in a rail above the board, near its last fret; its
 * description opens on demand under that control. All values are pixels along
 * the board's width.
 */

/** A control's touch target, square. */
export const CONTROL_SIZE = 44
/** Every control in the rail — region information, Play, tempo — looks alike: a 44 px square with
 *  its icon seated at the bottom, right on the board's top edge. */
export const RAIL_CONTROL_CLASS =
  'flex h-11 w-11 shrink-0 items-end justify-center rounded-md pb-1.5 hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus'
export const RAIL_ICON_SIZE = 18
/** How far each further overlapping region's outline sits inside the one before. */
const OUTLINE_STEP = 4
const EDGE_GAP = 4

export interface ControlAnchor {
  id: string
  /** The x of the region's last fret wire. */
  right: number
}

/**
 * One control per region, centred just inside its last fret. Controls that
 * would overlap sit side by side, the rightmost staying at its fret, and none
 * leaves the rail. When more controls than fit side by side share the rail
 * (a small compact card), the rest wrap onto further rows, left to right.
 * Returned in the order given.
 */
export function placeRegionControls(
  anchors: ControlAnchor[],
  railWidth: number,
): { id: string; center: number; row: number }[] {
  const half = CONTROL_SIZE / 2
  const perRow = Math.max(1, Math.floor(railWidth / CONTROL_SIZE))
  const sorted = anchors
    .map((anchor, order) => ({ id: anchor.id, order, center: Math.min(anchor.right - half, railWidth - half), row: 0 }))
    .sort((a, b) => a.center - b.center || a.order - b.order)
  const placed: typeof sorted = []
  for (let start = 0, row = 0; start < sorted.length; start += perRow, row++) {
    const inRow = sorted.slice(start, start + perRow)
    // Shared endpoints: shift the earlier controls left, keeping the last at its fret.
    for (let index = inRow.length - 2; index >= 0; index--) {
      inRow[index]!.center = Math.min(inRow[index]!.center, inRow[index + 1]!.center - CONTROL_SIZE)
    }
    // Then push any that fell off the left edge back right, still one control apart.
    for (let index = 0; index < inRow.length; index++) {
      const floor = index === 0 ? half : inRow[index - 1]!.center + CONTROL_SIZE
      inRow[index]!.center = Math.max(inRow[index]!.center, floor)
      inRow[index]!.row = row
    }
    placed.push(...inRow)
  }
  return placed.sort((a, b) => a.order - b.order).map(({ id, center, row }) => ({ id, center, row }))
}

/** The narrowest rail that fits `count` controls side by side. */
export function railWidthFor(count: number): number {
  return count === 0 ? 0 : count * CONTROL_SIZE + 2 * EDGE_GAP
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Region outlines, so overlapping regions stay distinguishable: each region
 * overlapping earlier ones is outlined one step inside the innermost of them,
 * as a parallel line. Fills are unaffected — they keep the full box.
 */
export function insetOverlappingOutlines(boxes: Box[]): Box[] {
  const lanes: number[] = []
  return boxes.map((box, index) => {
    let lane = 0
    const overlappingLanes = new Set(
      boxes
        .slice(0, index)
        .map((other, otherIndex) => (overlaps(box, other) ? lanes[otherIndex] : undefined))
        .filter((value): value is number => value !== undefined),
    )
    while (overlappingLanes.has(lane)) lane++
    lanes.push(lane)
    const inset = Math.min(lane * OUTLINE_STEP, box.width / 3, box.height / 3)
    return { x: box.x + inset, y: box.y + inset, width: box.width - 2 * inset, height: box.height - 2 * inset }
  })
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/**
 * A description's horizontal placement: ending just past its control when it
 * can, always inside the visible part of the board, and never wider than it.
 * `arrow` is where its pointer sits, from its left edge.
 */
export function anchorDescription(input: {
  controlCenter: number
  width: number
  scrollLeft: number
  visibleWidth: number
}): { left: number; width: number; arrow: number } {
  const width = Math.max(0, Math.min(input.width, input.visibleWidth - 2 * EDGE_GAP))
  const minLeft = input.scrollLeft + EDGE_GAP
  const maxLeft = input.scrollLeft + input.visibleWidth - width - EDGE_GAP
  const preferred = input.controlCenter + CONTROL_SIZE / 2 - width
  const left = Math.max(minLeft, Math.min(preferred, maxLeft))
  const arrow = Math.max(12, Math.min(input.controlCenter - left, width - 12))
  return { left, width, arrow }
}
