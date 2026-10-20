import type { CellPlace } from '@/shared/utils/fretboardCell'

/** A bass board shows at least this many frets from the nut. */
const MIN_BOARD_FRETS = 5

/** The last fret a board shows to mark places on: five from the nut, or up to the highest place. */
export function boardFretsFor(places: CellPlace[]): number {
  return Math.max(MIN_BOARD_FRETS, ...places.map((place) => place.fret))
}
