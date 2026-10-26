import { describe, expect, it } from 'vitest'

import { gradeEveryInstance } from '@/shared/utils/multiTap'
import type { CellPlace } from '@/shared/utils/fretboardCell'
import golden from '@/api/generated/golden/practice-graders/multi_tap.v2.json'

const instruments: Record<string, { tuning: string[] }> = golden.reference.instruments

// The server grades the same answers on every cell they cover; these shared cases keep the
// feedback a student sees in agreement with what's recorded on each cell.
describe('gradeEveryInstance against the multi_tap.v2 golden cases', () => {
  interface Case {
    name: string
    tuning: string[]
    planned: CellPlace
    fromFret: number
    taps: CellPlace[]
    graded: { string: number; fret: number; correct: boolean }[] | null
  }

  const cases = golden.cases.flatMap(({ name, item_key, response, expected }): Case[] => {
    const [kind, layout = '', str = '', fret = ''] = item_key.split(':')
    const tuning = instruments[layout]?.tuning
    if (kind !== 'fretboard_cell' || !tuning || !('cells' in response) || !response.fret_window) return []
    const base = { name, tuning, planned: { string: Number(str), fret: Number(fret) }, fromFret: response.fret_window.from_fret, taps: response.cells }
    if ('evidence_by_item' in expected && expected.evidence_by_item) {
      const graded = expected.evidence_by_item.map(({ evidence }) => ({
        string: evidence.answer_key.string,
        fret: evidence.answer_key.fret,
        correct: evidence.correct,
      }))
      return [{ ...base, graded }]
    }
    if ('reason' in expected && expected.reason === 'invalid_cell') return [{ ...base, graded: null }]
    return []
  })

  it('has cases to run, graded and refused', () => {
    expect(cases.some((c) => c.graded !== null)).toBe(true)
    expect(cases.some((c) => c.graded === null)).toBe(true)
  })

  it.each(cases)('$name', ({ tuning, planned, fromFret, taps, graded }) => {
    expect(gradeEveryInstance({ tuning, planned, fromFret }, taps)?.cells ?? null).toEqual(graded)
  })
})

describe('gradeEveryInstance', () => {
  const question = { tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], planned: { string: 6, fret: 3 }, fromFret: 3 }

  it('is all right only when every place is found and nothing else is tapped', () => {
    expect(gradeEveryInstance(question, [{ string: 6, fret: 3 }, { string: 1, fret: 3 }, { string: 4, fret: 5 }])?.allRight).toBe(true)
    expect(gradeEveryInstance(question, [{ string: 6, fret: 3 }, { string: 1, fret: 3 }])?.allRight).toBe(false)
  })

  it('counts a place tapped twice once, and never in place of one missed', () => {
    const twice = { string: 6, fret: 3 }
    expect(gradeEveryInstance(question, [twice, twice, { string: 1, fret: 3 }, { string: 4, fret: 5 }])?.allRight).toBe(true)
    expect(gradeEveryInstance(question, [twice, twice, { string: 1, fret: 3 }])?.allRight).toBe(false)
  })

  it('counts the places found, missed and the extra taps', () => {
    const grade = gradeEveryInstance(question, [{ string: 6, fret: 3 }, { string: 1, fret: 3 }, { string: 5, fret: 5 }])

    expect(grade).toMatchObject({ note: 'G', found: 2, places: 3, extra: 1 })
  })
})
