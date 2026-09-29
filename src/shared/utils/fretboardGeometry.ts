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
