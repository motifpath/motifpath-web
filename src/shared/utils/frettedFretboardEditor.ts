/**
 * Fixed full-neck fretboard geometry for the fretted position editor, and
 * click-to-cell math inverting `FrettedDiagramView`'s own pixel formulas —
 * a position placed here renders at the exact same spot that read-only
 * viewer would draw it at, since both use the same view box and margins.
 * Unlike the viewer's `computeFrettedDiagramLayout`, this never auto-crops
 * to a diagram's visible positions — an author needs the whole playable
 * range in view, not just whatever is already placed.
 */

export const EDITOR_VIEW_W = 720
export const EDITOR_VIEW_H = 300
export const EDITOR_MARGIN_LEFT = 44
export const EDITOR_MARGIN_RIGHT = 30
export const EDITOR_MARGIN_TOP = 34
export const EDITOR_MARGIN_BOTTOM = 40
export const EDITOR_BOARD_W = EDITOR_VIEW_W - EDITOR_MARGIN_LEFT - EDITOR_MARGIN_RIGHT
export const EDITOR_BOARD_H = EDITOR_VIEW_H - EDITOR_MARGIN_TOP - EDITOR_MARGIN_BOTTOM

export const DEFAULT_MIN_FRET = 0
export const DEFAULT_MAX_FRET = 15

export interface FrettedEditorGeometry {
  minFret: number
  maxFret: number
  stringCount: number
}

export function frettedEditorGeometry(
  stringCount: number,
  minFret: number = DEFAULT_MIN_FRET,
  maxFret: number = DEFAULT_MAX_FRET,
): FrettedEditorGeometry {
  return { minFret, maxFret, stringCount }
}

function colGap(geometry: FrettedEditorGeometry): number {
  return EDITOR_BOARD_W / (geometry.maxFret - geometry.minFret)
}

function rowGap(geometry: FrettedEditorGeometry): number {
  return EDITOR_BOARD_H / Math.max(geometry.stringCount - 1, 1)
}

/** X position of a fret line/marker, in the editor's SVG viewBox coordinates. */
export function fretX(fret: number, geometry: FrettedEditorGeometry): number {
  return EDITOR_MARGIN_LEFT + (fret - geometry.minFret) * colGap(geometry)
}

/** Y position of a string line/marker (1 = highest-pitched), in the editor's SVG viewBox coordinates. */
export function stringY(stringNumber: number, geometry: FrettedEditorGeometry): number {
  return EDITOR_MARGIN_TOP + (geometry.stringCount - stringNumber) * rowGap(geometry)
}

/**
 * Inverts a click point (already in the SVG's own viewBox coordinate space,
 * not raw screen pixels) to the nearest string/fret cell, snapping to
 * whichever cell's center is closest. Returns null when the click falls
 * outside the fretboard's playable bounds (before the lowest fret, past the
 * highest fret, above string 1, or below the last string) — an editor
 * component should ignore the click rather than place a position off-board.
 */
export function nearestFrettedCell(
  px: number,
  py: number,
  geometry: FrettedEditorGeometry,
): { string: number; fret: number } | null {
  const fret = Math.round((px - EDITOR_MARGIN_LEFT) / colGap(geometry) + geometry.minFret)
  const stringNumber = Math.round(geometry.stringCount - (py - EDITOR_MARGIN_TOP) / rowGap(geometry))

  if (fret < geometry.minFret || fret > geometry.maxFret) return null
  if (stringNumber < 1 || stringNumber > geometry.stringCount) return null

  return { string: stringNumber, fret }
}
