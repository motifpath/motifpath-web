/**
 * Find every instance: every place of a note within a fret window, tapped. Grades exactly as the
 * server does, so instant feedback never contradicts the record: right only when the places tapped
 * are exactly the note's places in the window, compared as sets, so a place tapped twice never
 * stands in for one missed.
 */
import type { CellPlace } from '@/shared/utils/fretboardCell'
import { pitchClassOf } from '@/shared/utils/harmony'
import { frettedPitch } from '@/shared/utils/pitch'

/** What the question asked: the layout's tuning, the note, and the window's lowest fret. */
export interface NoteWindow {
  tuning: string[]
  note: string
  fromFret: number
}

/** The window's highest fret: the open string to fret 5 at the nut, otherwise five frets. */
function windowEnd(fromFret: number): number {
  return fromFret === 0 ? 5 : fromFret + 4
}

/** Every place of the note in the window, by string from 1, then fret from the lowest. */
export function placesOfNote(window: NoteWindow): CellPlace[] {
  const note = pitchClassOf(window.note)
  const places: CellPlace[] = []
  for (let string = 1; string <= window.tuning.length; string++) {
    for (let fret = window.fromFret; fret <= windowEnd(window.fromFret); fret++) {
      const pitch = frettedPitch(window.tuning, string, fret)
      if (pitch !== null && pitch % 12 === note) places.push({ string, fret })
    }
  }
  return places
}

/** Whether the places tapped are exactly the note's; null when a tap is outside the window or off the instrument. */
export function gradeMultiTap(window: NoteWindow, cells: CellPlace[]): boolean | null {
  const end = windowEnd(window.fromFret)
  if (cells.some((c) => c.string < 1 || c.string > window.tuning.length || c.fret < window.fromFret || c.fret > end)) return null
  const places = placesOfNote(window)
  const tapped = new Set(cells.map((c) => `${c.string}:${c.fret}`))
  return tapped.size === places.length && places.every((p) => tapped.has(`${p.string}:${p.fret}`))
}
