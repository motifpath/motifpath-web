/**
 * Full-neck board layout for the fretted position editor, and click-to-cell math matching where a
 * marker is actually drawn — a click anywhere inside a fret *space* (the area between two fret
 * wires a marker is centred in) resolves to that fret, not to whichever wire is numerically
 * closest.
 *
 * Unlike a student's board, which fits the frets a diagram uses, the editor never crops: an
 * author needs the whole playable range to place a position anywhere. Its frets and strings are
 * spaced exactly as a student's board spaces them, so the author sees the board a student will;
 * the caller scrolls it when it's wider than its container.
 */
import { ROW_GAP, TARGET_RADIUS, fretLineX, fretboardGeometry, regionBandBox } from '@/shared/utils/fretboardGeometry'
import type { BoardFrame } from '@/shared/utils/fretboardGeometry'

export const DEFAULT_MIN_FRET = 0
export const DEFAULT_MAX_FRET = 24

/** Room above string 1: the wood's half-gap edge plus a little air. */
const MARGIN_TOP = 34
/** Room under the last string for the wood's edge and the fret numbers. */
const MARGIN_BOTTOM = 52

export interface FrettedEditorLayout {
  frame: BoardFrame
  /** The board's size in CSS pixels. */
  width: number
  height: number
}

export function frettedEditorLayout(
  stringCount: number,
  availableWidth: number,
  minFret: number = DEFAULT_MIN_FRET,
  maxFret: number = DEFAULT_MAX_FRET,
): FrettedEditorLayout {
  const geometry = fretboardGeometry({
    availableWidth,
    fretSpan: maxFret - minFret,
    stringCount,
    showsNut: minFret === 0,
  })
  return {
    frame: {
      minFret,
      maxFret,
      stringCount,
      left: geometry.left,
      columnGap: geometry.columnGap,
      rowGap: geometry.rowGap,
      top: MARGIN_TOP,
    },
    width: geometry.width,
    height: MARGIN_TOP + geometry.boardHeight + MARGIN_BOTTOM,
  }
}

/**
 * Inverts a click point (in the board's own coordinates, not raw screen pixels) to the
 * string/fret *cell* it visually falls in. For fret, that's the space a marker is drawn in — the
 * fret space it's centred in, or the nut for an open string (up to halfway to fret 1's marker) —
 * not the wire nearest the click. Returns null when the click falls off the playable board
 * (left of an open-string marker's touch target, past the highest fret, or more than half a
 * string gap beyond the outer strings) — an editor should ignore the click rather than place a
 * position off-board.
 */
export function nearestFrettedCell(px: number, py: number, frame: BoardFrame): { string: number; fret: number } | null {
  const relativeX = px - fretLineX(frame, frame.minFret)
  const nearNut = frame.minFret === 0 && relativeX >= -TARGET_RADIUS && relativeX <= frame.columnGap / 4
  // Left of the window's first wire there's no fret space, only the nut's open-string targets.
  if (!nearNut && relativeX <= 0) return null
  const fret = nearNut ? 0 : frame.minFret + Math.ceil(relativeX / frame.columnGap)
  const stringNumber = Math.round((py - frame.top) / ROW_GAP) + 1

  if (fret > frame.maxFret) return null
  if (stringNumber < 1 || stringNumber > frame.stringCount) return null

  return { string: stringNumber, fret }
}

export interface EditorRegionSpan {
  fretStart: number
  fretEnd: number
  /** Both null means the band covers every string. */
  stringStart: number | null
  stringEnd: number | null
}

/** Whether a region can be drawn on this board: frets in order and in range, and either no
 *  string limits or limits in order within the instrument's strings. */
export function isDrawableRegion(region: EditorRegionSpan, frame: BoardFrame): boolean {
  if (region.fretStart > region.fretEnd) return false
  if (region.fretStart < frame.minFret || region.fretEnd > frame.maxFret) return false
  if (region.stringStart === null && region.stringEnd === null) return true
  if (region.stringStart === null || region.stringEnd === null) return false
  return region.stringStart >= 1 && region.stringStart <= region.stringEnd && region.stringEnd <= frame.stringCount
}

/** A region's band, drawn exactly where a student's board draws it; no string limits means every string. */
export function editorRegionBox(
  region: EditorRegionSpan,
  frame: BoardFrame,
): { x: number; y: number; width: number; height: number } {
  return regionBandBox(frame, {
    fretStart: region.fretStart,
    fretEnd: region.fretEnd,
    stringStart: region.stringStart ?? 1,
    stringEnd: region.stringEnd ?? frame.stringCount,
  })
}
