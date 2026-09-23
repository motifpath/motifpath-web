import { describe, expect, it } from 'vitest'

import { intervalFromRoot, noteAtFret } from '@/shared/utils/musicTheory'

describe('noteAtFret', () => {
  it('returns the open-string note unchanged at fret 0', () => {
    expect(noteAtFret('E', 0)).toBe('E')
  })

  it('transposes up the chromatic scale by fret count', () => {
    expect(noteAtFret('E', 1)).toBe('F')
    expect(noteAtFret('E', 3)).toBe('G')
    expect(noteAtFret('A', 5)).toBe('D')
  })

  it('wraps past B back to C', () => {
    expect(noteAtFret('B', 1)).toBe('C')
  })

  it('wraps across more than one octave', () => {
    expect(noteAtFret('E', 13)).toBe('F')
  })

  it('accepts a flat-spelled open string note (e.g. Eb standard tuning), normalizing to its sharp equivalent', () => {
    expect(noteAtFret('Eb', 0)).toBe('D#')
    expect(noteAtFret('Eb', 1)).toBe('E')
    expect(noteAtFret('Bb', 3)).toBe('C#')
    expect(noteAtFret('Ab', 0)).toBe('G#')
    expect(noteAtFret('Db', 0)).toBe('C#')
    expect(noteAtFret('Gb', 0)).toBe('F#')
  })
})

describe('intervalFromRoot', () => {
  it('labels the root itself as R', () => {
    expect(intervalFromRoot('A', 'A')).toBe('R')
  })

  it('covers every semitone distance from the root', () => {
    expect(intervalFromRoot('A#', 'A')).toBe('b2')
    expect(intervalFromRoot('B', 'A')).toBe('2')
    expect(intervalFromRoot('C', 'A')).toBe('b3')
    expect(intervalFromRoot('C#', 'A')).toBe('3')
    expect(intervalFromRoot('D', 'A')).toBe('4')
    expect(intervalFromRoot('D#', 'A')).toBe('b5')
    expect(intervalFromRoot('E', 'A')).toBe('5')
    expect(intervalFromRoot('F', 'A')).toBe('b6')
    expect(intervalFromRoot('F#', 'A')).toBe('6')
    expect(intervalFromRoot('G', 'A')).toBe('b7')
    expect(intervalFromRoot('G#', 'A')).toBe('7')
  })

  it('wraps when the note is below the root chromatically', () => {
    expect(intervalFromRoot('G', 'B')).toBe('b6')
  })

  it('accepts a flat-spelled root or note', () => {
    expect(intervalFromRoot('G', 'Bb')).toBe('6')
    expect(intervalFromRoot('Eb', 'C')).toBe('b3')
  })
})
