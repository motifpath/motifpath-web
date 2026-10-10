import { describe, expect, it } from 'vitest'

import { nameTheNoteChoices } from '@/shared/utils/noteChoices'

const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
/** A tuning where string 3 sits a semitone below string 2, so its neighbour repeats a semitone choice. */
const SEMITONE_APART = ['E2', 'A2', 'D3', 'A#3', 'B3', 'E4']

const sorted = (notes: string[] | null) => [...(notes ?? [])].sort()

describe('nameTheNoteChoices', () => {
  it('offers the note, a semitone either side and the same fret on the next string', () => {
    expect(sorted(nameTheNoteChoices(STANDARD, { string: 5, fret: 3 }))).toEqual(['B', 'C', 'C#', 'F'])
  })

  it('takes string 2 as the neighbour of a cell on string 1', () => {
    expect(sorted(nameTheNoteChoices(STANDARD, { string: 1, fret: 3 }))).toEqual(['D', 'F#', 'G', 'G#'])
  })

  it('offers a note a tone above instead when the neighbour repeats a choice', () => {
    // String 3 fret 1 is B; string 2 fret 1 is C, already offered a semitone above.
    expect(sorted(nameTheNoteChoices(SEMITONE_APART, { string: 3, fret: 1 }))).toEqual(['A#', 'B', 'C', 'C#'])
  })

  it('shuffles the choices with the random source given', () => {
    const first = nameTheNoteChoices(STANDARD, { string: 5, fret: 3 }, () => 0)
    const last = nameTheNoteChoices(STANDARD, { string: 5, fret: 3 }, () => 0.999)
    expect(first).not.toEqual(last)
    expect(sorted(first)).toEqual(sorted(last))
  })

  it('is null for a string the tuning doesn’t have', () => {
    expect(nameTheNoteChoices(STANDARD, { string: 7, fret: 0 })).toBeNull()
  })
})
