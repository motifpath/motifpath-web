import { describe, expect, it } from 'vitest'

import { frettedPitch, parsePitch } from '@/shared/utils/pitch'

describe('parsePitch', () => {
  it.each([
    ['C4', 60],
    ['A4', 69],
    ['E2', 40],
    ['C#3', 49],
    ['Db3', 49],
    ['Bb3', 58],
    ['B#3', 60],
    ['Cb4', 59],
    ['F##2', 43],
    ['Ebb4', 62],
    ['C-1', 0],
  ])('reads %s as MIDI %i', (name, midi) => {
    expect(parsePitch(name)).toBe(midi)
  })

  it('is null for a note without an octave, or not a note at all', () => {
    expect(parsePitch('E')).toBeNull()
    expect(parsePitch('H2')).toBeNull()
    expect(parsePitch('')).toBeNull()
  })
})

describe('frettedPitch', () => {
  const standard = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

  it('counts strings from the highest-pitched one', () => {
    expect(frettedPitch(standard, 1, 0)).toBe(64)
    expect(frettedPitch(standard, 6, 0)).toBe(40)
  })

  it('adds a semitone per fret', () => {
    expect(frettedPitch(standard, 6, 5)).toBe(45)
    expect(frettedPitch(standard, 3, 2)).toBe(57)
  })

  it('is null when the tuning has no such string or no octaves', () => {
    expect(frettedPitch(standard, 7, 0)).toBeNull()
    expect(frettedPitch(['E', 'A', 'D', 'G', 'B', 'E'], 1, 0)).toBeNull()
  })
})
