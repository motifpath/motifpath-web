/**
 * The frets a fretboard drill is asked in: five frets, plus the open string when the window starts
 * at the nut. Cells never go past fret 11, so neither does a window.
 */
export interface FretWindowRange {
  /** The first fret, 0 for the open string. */
  from: number
  /** The last fret. */
  to: number
}

const WINDOW_FRETS = 5
const LAST_CELL_FRET = 11

export function fretWindowRange(fromFret: number): FretWindowRange {
  return { from: fromFret, to: fromFret === 0 ? WINDOW_FRETS : Math.min(fromFret + WINDOW_FRETS - 1, LAST_CELL_FRET) }
}

export function inFretWindow(range: FretWindowRange, fret: number): boolean {
  return fret >= range.from && fret <= range.to
}

/**
 * The fret lines a board draws to show just the window: from the nut when it starts there, else
 * from the line left of its first fret, so each of its frets gets a whole space.
 */
export function windowBoardFrets(range: FretWindowRange): { minFret: number; maxFret: number } {
  return { minFret: Math.max(range.from - 1, 0), maxFret: range.to }
}
