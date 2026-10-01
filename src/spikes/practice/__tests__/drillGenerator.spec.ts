import { describe, expect, it } from 'vitest'

import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import {
  findTheNoteQuestion,
  fretboardCellItems,
  nameTheNoteQuestion,
  noteName,
} from '@/spikes/practice/drillGenerator'
import { seededRandom } from '@/spikes/practice/random'

const guitar = makeFrettedInstrument()
const items = fretboardCellItems(guitar, { maxFret: 11, skillIdFor: (s) => `string-${s}` })

describe('noteName', () => {
  it('spells pitch classes with sharps', () => {
    expect(noteName(40)).toBe('E')
    expect(noteName(61)).toBe('C#')
    expect(noteName(57)).toBe('A')
  })
})

describe('fretboardCellItems', () => {
  it('makes one item per string and fret, open strings included', () => {
    expect(items).toHaveLength(6 * 12)
  })

  it('names each cell by its sounding pitch and tags its string skill', () => {
    const cell = items.find((i) => i.string === 5 && i.fret === 3)
    expect(cell).toMatchObject({
      kind: 'fretboard_cell',
      item_key: 'fretboard_cell:instrument-guitar:5:3',
      note_name: 'C',
      skill_ids: ['string-5'],
    })
  })
})

describe('nameTheNoteQuestion', () => {
  it('offers four distinct note names, the right one among them', () => {
    const cell = items.find((i) => i.string === 1 && i.fret === 7)!
    const q = nameTheNoteQuestion(cell, seededRandom(1))
    expect(q.answer).toBe('B')
    expect(q.choices).toHaveLength(4)
    expect(new Set(q.choices).size).toBe(4)
    expect(q.choices).toContain('B')
  })
})

describe('findTheNoteQuestion', () => {
  it('asks for the note on its string, every fret of the window tappable', () => {
    const cell = items.find((i) => i.string === 6 && i.fret === 3)!
    const q = findTheNoteQuestion(cell, 11)
    expect(q).toMatchObject({ string: 6, note_name: 'G', answer_fret: 3 })
    expect(q.frets).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })
})
