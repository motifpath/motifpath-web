import { describe, expect, it } from 'vitest'

import { barStarts, describeNoteValue, isValidTempoBpm, noteValue, pulse, sameNoteValue } from '@/shared/utils/sequence'

const step = (num: number, den: number) => ({ position_ids: ['p'], value: { num, den }, strum: 'none' as const })

describe('pulse', () => {
  it.each([
    [4, 4, { num: 1, den: 4 }],
    [3, 4, { num: 1, den: 4 }],
    [2, 2, { num: 1, den: 2 }],
    [7, 8, { num: 1, den: 8 }],
    [5, 8, { num: 1, den: 8 }],
  ] as const)('counts simple and irregular %i/%i in its written beat', (beats, beatValue, expected) => {
    expect(pulse({ beats, beat_value: beatValue })).toEqual(expected)
  })

  it.each([
    [6, 8, { num: 3, den: 8 }],
    [9, 8, { num: 3, den: 8 }],
    [12, 8, { num: 3, den: 8 }],
    [6, 4, { num: 3, den: 4 }],
    [15, 16, { num: 3, den: 16 }],
  ] as const)('counts compound %i/%i in dotted beats', (beats, beatValue, expected) => {
    expect(pulse({ beats, beat_value: beatValue })).toEqual(expected)
  })

  it('counts 6/2 simply, since a dotted whole note is no one’s pulse', () => {
    expect(pulse({ beats: 6, beat_value: 2 })).toEqual({ num: 1, den: 2 })
  })
})

describe('noteValue', () => {
  it('is the plain fraction of a whole note', () => {
    expect(noteValue(8)).toEqual({ num: 1, den: 8 })
    expect(noteValue(1)).toEqual({ num: 1, den: 1 })
  })

  it('lengthens a dotted note by half', () => {
    expect(noteValue(4, { dotted: true })).toEqual({ num: 3, den: 8 })
    expect(noteValue(1, { dotted: true })).toEqual({ num: 3, den: 2 })
  })

  it('fits a tuplet’s notes into the time of the usual count, reduced', () => {
    expect(noteValue(8, { tuplet: 3 })).toEqual({ num: 1, den: 12 })
    expect(noteValue(4, { tuplet: 3 })).toEqual({ num: 1, den: 6 })
    expect(noteValue(16, { tuplet: 5 })).toEqual({ num: 1, den: 20 })
  })
})

describe('describeNoteValue', () => {
  it('reads a stored fraction back as the note it was built from', () => {
    expect(describeNoteValue({ num: 1, den: 4 })).toEqual({ base: 4, dotted: false, tuplet: null })
    expect(describeNoteValue({ num: 3, den: 8 })).toEqual({ base: 4, dotted: true, tuplet: null })
    expect(describeNoteValue({ num: 1, den: 12 })).toEqual({ base: 8, dotted: false, tuplet: 3 })
    expect(describeNoteValue({ num: 1, den: 20 })).toEqual({ base: 16, dotted: false, tuplet: 5 })
    expect(describeNoteValue({ num: 2, den: 8 })).toEqual({ base: 4, dotted: false, tuplet: null })
  })

  it('reads a sixteenth-note sextuplet as sixteenth triplets, which last exactly as long', () => {
    expect(describeNoteValue({ num: 1, den: 24 })).toEqual({ base: 16, dotted: false, tuplet: 3 })
  })

  it('is null for a length no single note, dot or tuplet writes', () => {
    expect(describeNoteValue({ num: 5, den: 8 })).toBeNull()
  })
})

describe('sameNoteValue', () => {
  it('compares fractions by length, not by how they are written', () => {
    expect(sameNoteValue({ num: 2, den: 8 }, { num: 1, den: 4 })).toBe(true)
    expect(sameNoteValue({ num: 1, den: 8 }, { num: 1, den: 4 })).toBe(false)
  })
})

describe('barStarts', () => {
  it('marks the steps that start a new bar of 4/4', () => {
    const steps = [step(1, 4), step(1, 4), step(1, 2), step(1, 4), step(3, 4), step(1, 4)]

    expect(barStarts(steps, { beats: 4, beat_value: 4 })).toEqual([false, false, false, true, false, true])
  })

  it('marks a step that starts after a note crossed the bar line', () => {
    const steps = [step(3, 4), step(1, 2), step(1, 4)]

    expect(barStarts(steps, { beats: 4, beat_value: 4 })).toEqual([false, false, true])
  })

  it('keeps triplets exact, with no rounding drift across the bar', () => {
    const steps = [...Array.from({ length: 12 }, () => step(1, 12)), step(1, 4)]

    expect(barStarts(steps, { beats: 4, beat_value: 4 }).indexOf(true)).toBe(12)
  })

  it('uses the bar length of the time signature', () => {
    const steps = Array.from({ length: 7 }, () => step(1, 8))

    expect(barStarts(steps, { beats: 6, beat_value: 8 })).toEqual([false, false, false, false, false, false, true])
  })
})

describe('isValidTempoBpm', () => {
  it.each([
    [20, true],
    [300, true],
    [90, true],
    [19, false],
    [301, false],
    [90.5, false],
    [Number.NaN, false],
  ])('%s BPM is valid: %s', (bpm, valid) => {
    expect(isValidTempoBpm(bpm)).toBe(valid)
  })
})
