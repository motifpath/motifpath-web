import { describe, expect, it } from 'vitest'

import { cellNoteName, gradeFretboardCell } from '@/shared/utils/fretboardCell'
import type { CellAnswer, CellPlace } from '@/shared/utils/fretboardCell'
import golden from '@/api/generated/golden/practice-graders/fretboard_cell.v1.json'

const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

describe('cellNoteName', () => {
  it('names a cell’s note with sharps', () => {
    expect(cellNoteName(STANDARD, { string: 6, fret: 2 })).toBe('F#')
    expect(cellNoteName(STANDARD, { string: 5, fret: 3 })).toBe('C')
  })

  it('is null for a string the tuning doesn’t have', () => {
    expect(cellNoteName(STANDARD, { string: 7, fret: 0 })).toBeNull()
  })
})

describe('gradeFretboardCell', () => {
  it('takes any spelling of the cell’s pitch when naming the note', () => {
    expect(gradeFretboardCell(STANDARD, { string: 6, fret: 2 }, { response_type: 'name_the_note', note_name: 'Gb' })).toBe(true)
  })

  it('is null for a tap on a string the tuning doesn’t have', () => {
    expect(gradeFretboardCell(STANDARD, { string: 6, fret: 1 }, { response_type: 'find_the_note', string: 7, fret: 1 })).toBeNull()
  })
})

// The server grades the same answers; these shared cases keep the feedback a student sees in
// agreement with what's recorded. Rejections other than an invalid cell are about the item or
// the response's shape, which a client never gets wrong for a cell it was given.
describe('gradeFretboardCell against the fretboard_cell.v1 golden cases', () => {
  const instruments: Record<string, { tuning: string[] }> = golden.reference.instruments

  interface Case {
    name: string
    tuning: string[]
    cell: CellPlace
    answer: CellAnswer
    correct: boolean | null
    noteName: string | undefined
  }

  const cases = golden.cases.flatMap(({ name, item_key, response, expected }): Case[] => {
    const [, instrumentId = '', string = '', fret = ''] = item_key.split(':')
    const tuning = instruments[instrumentId]?.tuning
    if (!tuning) return []
    const answer: CellAnswer | null =
      response.response_type === 'name_the_note' && response.note_name !== undefined
        ? { response_type: 'name_the_note', note_name: response.note_name }
        : response.response_type === 'find_the_note' && response.string !== undefined && response.fret !== undefined
          ? { response_type: 'find_the_note', string: response.string, fret: response.fret }
          : null
    if (!answer) return []
    const cell = { string: Number(string), fret: Number(fret) }
    if ('evidence' in expected && expected.evidence && 'answer_key' in expected.evidence) {
      const { correct, answer_key } = expected.evidence
      const noteName = 'note_name' in answer_key ? answer_key.note_name : undefined
      return [{ name, tuning, cell, answer, correct: correct ?? null, noteName }]
    }
    if ('reason' in expected && expected.reason === 'invalid_cell') return [{ name, tuning, cell, answer, correct: null, noteName: undefined }]
    return []
  })

  it('has cases to run', () => {
    expect(cases.length).toBeGreaterThan(0)
  })

  it.each(cases)('$name', ({ tuning, cell, answer, correct, noteName }) => {
    expect(gradeFretboardCell(tuning, cell, answer)).toBe(correct)
    if (noteName !== undefined) expect(cellNoteName(tuning, cell)).toBe(noteName)
  })
})
