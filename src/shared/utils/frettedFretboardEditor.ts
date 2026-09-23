/**
 * Fixed full-neck fretboard geometry for the fretted position editor, and
 * click-to-cell math matching where `positionX` actually draws a marker —
 * a click anywhere inside the visual fret *space* (the area between two
 * fret wires a marker is centered in) resolves to that fret, not to
 * whichever wire is numerically closest.
 * Unlike the viewer's `computeFrettedDiagramLayout`, this never auto-crops
 * to a diagram's visible positions — an author needs the whole playable
 * range in view, not just whatever is already placed. The board's pixel
 * width grows with the fret range (a fixed per-fret width, not a fixed
 * total width) so a wide range (up to the 24-fret max) stays comfortable to
 * click instead of being squeezed into a fixed box — the caller wraps the
 * SVG in a horizontally scrolling container for when it doesn't fit.
 */

export const EDITOR_VIEW_H = 300
export const EDITOR_MARGIN_LEFT = 44
export const EDITOR_MARGIN_RIGHT = 30
export const EDITOR_MARGIN_TOP = 34
export const EDITOR_MARGIN_BOTTOM = 40
export const EDITOR_BOARD_H = EDITOR_VIEW_H - EDITOR_MARGIN_TOP - EDITOR_MARGIN_BOTTOM

// Fixed pixel width per fret (not derived from a fixed total board width) —
// matches the density the original 0-15 fixed layout had, so the common
// (<=15 fret) case looks the same as before; a wider range just extends the
// board rather than shrinking every column.
export const EDITOR_PX_PER_FRET = 43

export const DEFAULT_MIN_FRET = 0
export const DEFAULT_MAX_FRET = 24

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

/** Total board pixel width for this geometry's fret range. */
export function editorBoardWidth(geometry: FrettedEditorGeometry): number {
  return EDITOR_PX_PER_FRET * (geometry.maxFret - geometry.minFret)
}

/** Total SVG viewBox width (board plus both margins) for this geometry's fret range. */
export function editorViewWidth(geometry: FrettedEditorGeometry): number {
  return EDITOR_MARGIN_LEFT + editorBoardWidth(geometry) + EDITOR_MARGIN_RIGHT
}

function rowGap(geometry: FrettedEditorGeometry): number {
  return EDITOR_BOARD_H / Math.max(geometry.stringCount - 1, 1)
}

/** X position of a fret line/label, in the editor's SVG viewBox coordinates. */
export function fretX(fret: number, geometry: FrettedEditorGeometry): number {
  return EDITOR_MARGIN_LEFT + (fret - geometry.minFret) * EDITOR_PX_PER_FRET
}

/**
 * X position for a *position marker* at `fret` — the middle of the fret
 * space behind the fret wire (between the `fret - 1` and `fret` wires),
 * matching standard fretboard-diagram convention. An open-string position
 * (`fret === 0`) sits half a fret space to the left of the nut, since there
 * is no wire behind it to sit between.
 */
export function positionX(fret: number, geometry: FrettedEditorGeometry): number {
  if (fret === 0) return fretX(0, geometry) - EDITOR_PX_PER_FRET / 2
  return (fretX(fret - 1, geometry) + fretX(fret, geometry)) / 2
}

/** Y position of a string line/marker (1 = highest-pitched, drawn at the top). */
export function stringY(stringNumber: number, geometry: FrettedEditorGeometry): number {
  return EDITOR_MARGIN_TOP + (stringNumber - 1) * rowGap(geometry)
}

/**
 * Inverts a click point (already in the SVG's own viewBox coordinate space,
 * not raw screen pixels) to whichever string/fret *cell* it visually falls
 * in. For fret, that's the space a marker actually gets drawn in via
 * `positionX` — the half-fret-space region centered on it — not the wire
 * numerically nearest the click. Returns null when the click falls outside
 * the fretboard's playable bounds (before the open-string zone, past the
 * highest fret, above string 1, or below the last string) — an editor
 * component should ignore the click rather than place a position off-board.
 */
export function nearestFrettedCell(
  px: number,
  py: number,
  geometry: FrettedEditorGeometry,
): { string: number; fret: number } | null {
  const relativeX = px - EDITOR_MARGIN_LEFT
  const fret = geometry.minFret + Math.ceil(relativeX / EDITOR_PX_PER_FRET)
  const stringNumber = Math.round((py - EDITOR_MARGIN_TOP) / rowGap(geometry)) + 1

  if (fret < geometry.minFret || fret > geometry.maxFret) return null
  if (stringNumber < 1 || stringNumber > geometry.stringCount) return null

  return { string: stringNumber, fret }
}
