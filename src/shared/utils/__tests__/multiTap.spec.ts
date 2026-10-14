import { describe, expect, it } from 'vitest'

import { gradeMultiTap, placesOfNote } from '@/shared/utils/multiTap'
import golden from '@/api/generated/golden/practice-graders/multi_tap.v1.json'

const instruments: Record<string, { tuning: string[] }> = golden.reference.instruments

// The server grades the same answers; these shared cases keep the feedback a student sees in
// agreement with what's recorded. A tap outside the window or off the instrument is the only
// rejection a client can meet.
describe('gradeMultiTap against the multi_tap.v1 golden cases', () => {
  const cases = golden.cases.flatMap(({ name, item_key, response, expected }) => {
    if (response.response_type !== 'multi_tap' || !('cells' in response)) return []
    const [, layout = '', note = ''] = item_key.split(':')
    const tuning = instruments[layout]?.tuning
    if (!tuning) return []
    const window = { tuning, note, fromFret: response.fret_window.from_fret }
    if ('evidence' in expected && expected.evidence) {
      const { correct, answer_key } = expected.evidence as { correct: boolean; answer_key: { cells: { string: number; fret: number }[] } }
      return [{ name, window, cells: response.cells, correct: correct as boolean | null, places: answer_key.cells }]
    }
    if ('reason' in expected && expected.reason === 'invalid_cell') return [{ name, window, cells: response.cells, correct: null, places: null }]
    return []
  })

  it('has cases to run, right, wrong and refused', () => {
    expect(cases.some((c) => c.correct === true)).toBe(true)
    expect(cases.some((c) => c.correct === false)).toBe(true)
    expect(cases.some((c) => c.correct === null)).toBe(true)
  })

  it.each(cases)('$name', ({ window, cells, correct }) => {
    expect(gradeMultiTap(window, cells)).toBe(correct)
  })

  // A wrong answer reveals every place: the cells the server's answer key names, in its order.
  it.each(cases.filter((c) => c.places !== null))('reveals the answer key’s places: $name', ({ window, places }) => {
    expect(placesOfNote(window)).toEqual(places)
  })
})

describe('gradeMultiTap', () => {
  const window = { tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], note: 'G', fromFret: 3 }

  it('counts a place tapped twice once', () => {
    expect(gradeMultiTap(window, [{ string: 6, fret: 3 }, { string: 6, fret: 3 }, { string: 1, fret: 3 }, { string: 4, fret: 5 }])).toBe(true)
  })

  it('never lets a place tapped twice stand in for one missed', () => {
    expect(gradeMultiTap(window, [{ string: 6, fret: 3 }, { string: 6, fret: 3 }, { string: 1, fret: 3 }])).toBe(false)
  })
})
