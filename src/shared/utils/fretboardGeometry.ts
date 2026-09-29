/**
 * Readable fretboard geometry in CSS pixels. The board is drawn at its real
 * size rather than scaled to fit, so text and touch targets stay readable on a
 * phone: it fills the width it's given when every fret space fits, and grows
 * wider (for its container to scroll) when they don't. Every fret space has
 * the same width.
 */
import { parsePitch } from '@/shared/utils/pitch'

/** Distance between strings: one touch target. */
export const ROW_GAP = 44
/** The narrowest fret space, so markers on neighbouring frets keep separate touch targets. */
export const MIN_COLUMN_GAP = 48
/** With the nut shown, an open-string marker sits on it and a fret-1 marker mid-space, half a
 *  column away: a column this wide keeps their touch targets apart. */
export const MIN_COLUMN_GAP_WITH_NUT = 88
/** Room left of the nut for an open-string marker, drawn centred on it. */
const NUT_MARGIN = 26
const EDGE_MARGIN = 4

export interface FretboardGeometry {
  /** The whole board's width, margins included. */
  width: number
  /** Where the first fret wire (or the nut) sits. */
  left: number
  right: number
  columnGap: number
  rowGap: number
  /** From the first string to the last. */
  boardHeight: number
}

export function fretboardGeometry(input: {
  availableWidth: number
  fretSpan: number
  stringCount: number
  showsNut: boolean
}): FretboardGeometry {
  const left = input.showsNut ? NUT_MARGIN : EDGE_MARGIN
  const right = EDGE_MARGIN
  const span = Math.max(input.fretSpan, 1)
  const minimumGap = input.showsNut ? MIN_COLUMN_GAP_WITH_NUT : MIN_COLUMN_GAP
  const width = Math.max(input.availableWidth, span * minimumGap + left + right)
  return {
    width,
    left,
    right,
    columnGap: (width - left - right) / span,
    rowGap: ROW_GAP,
    boardHeight: Math.max(input.stringCount - 1, 0) * ROW_GAP,
  }
}

/** A board laid out on the page: its fret window, and where its first fret wire and string sit. */
export interface BoardFrame {
  minFret: number
  maxFret: number
  stringCount: number
  /** Where the window's lowest fret wire (or the nut) sits. */
  left: number
  columnGap: number
  rowGap: number
  /** Where string 1 sits. */
  top: number
}

/** A fret wire's x position; fret 0 is the nut. */
export function fretLineX(frame: BoardFrame, fret: number): number {
  return frame.left + (fret - frame.minFret) * frame.columnGap
}

/** A marker's x position: the middle of the fret space behind its fret wire, or on the nut for
 *  an open string, as fretboard diagrams conventionally draw them. */
export function markerCenterX(frame: BoardFrame, fret: number): number {
  if (fret === 0) return fretLineX(frame, 0)
  return (fretLineX(frame, fret - 1) + fretLineX(frame, fret)) / 2
}

/** A string's y position; string 1 (the highest-pitched) is drawn at the top, as in tab. */
export function stringLineY(frame: BoardFrame, stringNumber: number): number {
  return frame.top + (stringNumber - 1) * frame.rowGap
}

/** Half the width of a band covering only the open strings: it surrounds the markers on the nut. */
const OPEN_BAND_HALF_WIDTH = 22

/**
 * A region's band: whole fret spaces from the wire before `fretStart` (the nut for fret 0) to
 * `fretEnd`'s wire, and from half a string gap above its first string to half a gap below its
 * last. A band of only the open strings has no fret space, so it surrounds the nut, where their
 * markers sit.
 */
export function regionBandBox(
  frame: BoardFrame,
  band: { fretStart: number; fretEnd: number; stringStart: number; stringEnd: number },
): { x: number; y: number; width: number; height: number } {
  const nut = fretLineX(frame, 0)
  const openOnly = band.fretEnd === 0
  const left = openOnly ? nut - OPEN_BAND_HALF_WIDTH : fretLineX(frame, Math.max(band.fretStart - 1, 0))
  const right = openOnly ? nut + OPEN_BAND_HALF_WIDTH : fretLineX(frame, band.fretEnd)
  const top = stringLineY(frame, band.stringStart) - frame.rowGap / 2
  const bottom = stringLineY(frame, band.stringEnd) + frame.rowGap / 2
  return { x: left, y: top, width: right - left, height: bottom - top }
}

const UNIFORM_THICKNESS = 1.6
const THINNEST = 0.9
const THICKEST = 4
/** The pitch drawn at 1 px (E4, a guitar's high E); each semitone lower adds a tenth of a pixel. */
const REFERENCE_PITCH = 64

/**
 * Each string's drawn thickness, string 1 first, from its open pitch: a lower
 * pitch is never thinner. A string without a known pitch (no tuning at all, or
 * an entry without an octave) is drawn at a uniform thickness.
 */
export function stringThicknesses(tuning: string[] | undefined, stringCount: number): number[] {
  const widths: number[] = []
  for (let string = 1; string <= stringCount; string++) {
    const open = tuning?.[tuning.length - string]
    const pitch = open === undefined ? null : parsePitch(open)
    widths.push(
      pitch === null
        ? UNIFORM_THICKNESS
        : Math.min(THICKEST, Math.max(THINNEST, 1 + (REFERENCE_PITCH - pitch) * 0.1)),
    )
  }
  return widths
}
