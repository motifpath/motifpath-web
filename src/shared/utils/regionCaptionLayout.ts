/**
 * Places highlighted-region captions above a fretboard so none of them collide. Each caption
 * sits on a line ("lane") of its own when its text or its band's fret span would overlap
 * another caption's on the same line; lanes are reused greedily, left to right, so the stack
 * is as short as the overlaps allow. Lane 0 is the line nearest the board.
 *
 * Coordinates are the caller's SVG viewBox units. Text width is estimated from the character
 * count — both fretboards render captions in a monospace font, so this is close without
 * measuring the DOM.
 */

export const CAPTION_FONT_SIZE = 12
/** Vertical room one caption line (text plus the bar under it) takes above the board. */
export const CAPTION_LANE_HEIGHT = 20
/** Height of the bar under a caption that spans its band's frets. */
export const CAPTION_BAR_HEIGHT = 3
// A little over the 0.6em advance common monospace fonts use, so a caption never ends up
// wider than its estimate.
const CHAR_WIDTH = CAPTION_FONT_SIZE * 0.62
const TEXT_INSET = 4
const MIN_GAP = 8

export interface CaptionSpan {
  /** The band's left edge. */
  left: number
  /** The band's right edge. */
  right: number
  text: string
}

export interface CaptionPlacement {
  lane: number
  textX: number
}

export function captionTextWidth(text: string): number {
  return text.length * CHAR_WIDTH
}

/** Placements come back in the same order as `spans`. */
export function layoutRegionCaptions(
  spans: CaptionSpan[],
  maxX: number,
): { placements: CaptionPlacement[]; laneCount: number } {
  const placements: CaptionPlacement[] = spans.map((span) => {
    const width = captionTextWidth(span.text)
    return { lane: 0, textX: Math.max(Math.min(span.left + TEXT_INSET, maxX - width), 0) }
  })
  const extents = spans.map((span, index) => ({
    start: Math.min(span.left, placements[index]!.textX),
    end: Math.max(span.right, placements[index]!.textX + captionTextWidth(span.text)),
  }))

  const order = spans.map((_, index) => index).sort((a, b) => extents[a]!.start - extents[b]!.start)
  // Where each lane's last caption ends.
  const laneEnds: number[] = []
  for (const index of order) {
    const extent = extents[index]!
    let lane = laneEnds.findIndex((end) => end + MIN_GAP <= extent.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = extent.end
    placements[index]!.lane = lane
  }

  return { placements, laneCount: laneEnds.length }
}
