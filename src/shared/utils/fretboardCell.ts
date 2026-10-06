/**
 * Fretboard cells as a practice drill asks them: name the note of a cell shown, or find a note on
 * the string asked. Grades exactly as the server does, so instant feedback never contradicts the
 * record: any spelling of the right pitch names it, and finding it counts in any octave on the
 * asked string, but not on another string.
 */
import type { components } from '@/api/generated/event-ingestion'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'
import { frettedPitch } from '@/shared/utils/pitch'

type NameTheNote = components['schemas']['NameTheNoteResponse']
type FindTheNote = components['schemas']['FindTheNoteResponse']

/** A cell's place: string 1 is the highest-pitched, fret 0 the open string. */
export interface CellPlace {
  string: number
  fret: number
}

/** What the student answered, before it's timed. */
export type CellAnswer = Pick<NameTheNote, 'response_type' | 'note_name'> | Pick<FindTheNote, 'response_type' | 'string' | 'fret'>

const LETTER_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** The pitch class (0 = C) of a note name such as "F#" or "Gb"; null for anything else. */
function pitchClassOf(noteName: string): number | null {
  const match = /^([A-G])([#b]?)$/.exec(noteName)
  if (!match) return null
  const [, letter = '', accidental = ''] = match
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
  return (((LETTER_CLASS[letter] ?? 0) + shift) % 12 + 12) % 12
}

function pitchClassAt(tuning: string[], place: CellPlace): number | null {
  const pitch = frettedPitch(tuning, place.string, place.fret)
  return pitch === null ? null : pitch % 12
}

/** The note of a cell, spelled with sharps; null when the tuning has no such string. */
export function cellNoteName(tuning: string[], cell: CellPlace): string | null {
  const pitchClass = pitchClassAt(tuning, cell)
  return pitchClass === null ? null : (CHROMATIC_SCALE[pitchClass] ?? null)
}

/** Whether the answer is right for the cell; null when the cell or the tap isn't on the instrument. */
export function gradeFretboardCell(tuning: string[], cell: CellPlace, answer: CellAnswer): boolean | null {
  const asked = pitchClassAt(tuning, cell)
  if (asked === null) return null
  if (answer.response_type === 'name_the_note') return pitchClassOf(answer.note_name) === asked
  const tapped = pitchClassAt(tuning, answer)
  if (tapped === null) return null
  return answer.string === cell.string && tapped === asked
}
