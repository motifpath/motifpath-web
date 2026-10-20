/**
 * The four notes a name-the-note cell is answered from: the cell's note and three near misses, a
 * semitone below, a semitone above, and the note at the same fret on the neighbouring string
 * (the next higher-pitched one, or string 2 for a cell on string 1). Those are the slips a student
 * actually makes — a fret off, or a string off — so a wrong pick among them says something. When
 * the neighbour's note repeats a choice, a note a tone away takes its place, so the four are
 * always different pitches, as the grader requires.
 */
import type { CellPlace } from '@/shared/utils/fretboardCell'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'
import { frettedPitch } from '@/shared/utils/pitch'

const noteOf = (pitchClass: number) => CHROMATIC_SCALE[((pitchClass % 12) + 12) % 12] ?? ''

/** A shuffled copy of the list, drawing from `random` (0 inclusive to 1 exclusive). */
function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/** The cell's four choices, spelled with sharps and shuffled; null when the tuning has no such string. */
export function nameTheNoteChoices(tuning: string[], cell: CellPlace, random: () => number = Math.random): string[] | null {
  const asked = frettedPitch(tuning, cell.string, cell.fret)
  const neighbourString = cell.string === 1 ? 2 : cell.string - 1
  const neighbour = frettedPitch(tuning, neighbourString, cell.fret)
  if (asked === null || neighbour === null) return null

  const choices = [asked, asked - 1, asked + 1].map(noteOf)
  // A tone above never repeats the other three, so the neighbour always has a stand-in.
  const neighbourNote = noteOf(neighbour)
  const fourth = choices.includes(neighbourNote) ? noteOf(asked + 2) : neighbourNote
  return shuffled([...choices, fourth], random)
}
