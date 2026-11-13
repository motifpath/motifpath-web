import type { CellPlace } from '@/shared/utils/fretboardCell'
import type { FretWindowRange } from '@/shared/utils/fretWindow'

/** A bass board shows at least this many frets from the nut. */
const MIN_BOARD_FRETS = 5

/** The last fret a board shows to mark places on: five from the nut, or up to the highest place. */
export function boardFretsFor(places: CellPlace[]): number {
  return Math.max(MIN_BOARD_FRETS, ...places.map((place) => place.fret))
}

/** The frets a bass drill's notes are placed in: five, from the fret the plan starts its window on. */
const BASS_WINDOW_FRETS = 5

/** The five-fret window a bass drill's plan places its notes in, from its starting fret. */
export function bassWindow(startFret: number): FretWindowRange {
  return { from: startFret, to: startFret + BASS_WINDOW_FRETS - 1 }
}
