import { describe, expect, it } from 'vitest'

import { boardFretsFor } from '@/features/student/utils/chordPlaces'

describe('boardFretsFor', () => {
  it('shows five frets from the nut for places low on the neck', () => {
    expect(boardFretsFor([{ string: 3, fret: 0 }, { string: 3, fret: 3 }])).toBe(5)
    expect(boardFretsFor([])).toBe(5)
  })

  it('reaches the highest place further up', () => {
    expect(boardFretsFor([{ string: 4, fret: 5 }, { string: 3, fret: 7 }])).toBe(7)
  })
})
