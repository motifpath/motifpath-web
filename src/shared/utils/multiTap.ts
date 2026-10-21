/**
 * Find every instance: every place of a note within a fret window, tapped. Grades exactly as the
 * server does, so instant feedback never contradicts the record: right only when the places tapped
 * are exactly the note's places in the window, compared as sets, so a place tapped twice never
 * stands in for one missed.
 */
import type { CellPlace } from '@/shared/utils/fretboardCell'
import { pitchClassOf } from '@/shared/utils/harmony'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'
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

/** A fretboard cell asked to find every instance of its note: the layout's tuning, the cell, and the window's lowest fret. */
export interface EveryInstanceQuestion {
  tuning: string[]
  planned: CellPlace
  fromFret: number
}

/** How one cell the answer covers was graded. */
export interface GradedPlace extends CellPlace {
  correct: boolean
}

/** An answer graded on every cell it covers, with the counts its feedback names. */
export interface EveryInstanceGrade {
  /** The note asked, spelled with sharps. */
  note: string
  /** Every place of the note and every cell tapped, by string from 1, then fret from the lowest. */
  cells: GradedPlace[]
  places: number
  found: number
  extra: number
  allRight: boolean
}

function inWindow(place: CellPlace, tuning: string[], fromFret: number): boolean {
  return place.string >= 1 && place.string <= tuning.length && place.fret >= fromFret && place.fret <= windowEnd(fromFret)
}

const placeKey = (place: CellPlace) => `${place.string}:${place.fret}`

/**
 * Grades finding every instance of the planned cell's note on every cell it covers, exactly as the
 * server does: each place of the note in the window is right when tapped and wrong when missed, and
 * each other cell tapped is wrong. Null when the planned cell or a tap is outside the window or off
 * the instrument.
 */
export function gradeEveryInstance(question: EveryInstanceQuestion, taps: CellPlace[]): EveryInstanceGrade | null {
  const { tuning, planned, fromFret } = question
  const plannedPitch = frettedPitch(tuning, planned.string, planned.fret)
  if (plannedPitch === null || !inWindow(planned, tuning, fromFret) || taps.some((t) => !inWindow(t, tuning, fromFret))) return null

  const note = CHROMATIC_SCALE[plannedPitch % 12] ?? ''
  const places = placesOfNote({ tuning, note, fromFret })
  const placeKeys = new Set(places.map(placeKey))
  const tapped = new Set(taps.map(placeKey))
  const covered = new Map<string, CellPlace>()
  for (const place of [...places, ...taps]) covered.set(placeKey(place), { string: place.string, fret: place.fret })

  const cells = [...covered.values()]
    .sort((a, b) => a.string - b.string || a.fret - b.fret)
    .map((place) => ({ ...place, correct: placeKeys.has(placeKey(place)) && tapped.has(placeKey(place)) }))
  const found = places.filter((p) => tapped.has(placeKey(p))).length
  const extra = [...tapped].filter((k) => !placeKeys.has(k)).length
  return { note, cells, places: places.length, found, extra, allRight: found === places.length && extra === 0 }
}
