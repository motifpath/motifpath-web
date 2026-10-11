import { describe, expect, it } from 'vitest'

import { CHORD_QUALITIES, chordSymbolOf, readTypedChord } from '@/shared/utils/chordSymbolInput'

describe('readTypedChord', () => {
  it.each([
    ['am', 'Am'],
    ['AM7', 'Am7'],
    ['a', 'A'],
    ['g', 'G'],
    ['  c#13b9 ', 'C#13b9'],
    ['BB', 'Bb'],
    ['g/b', 'G/B'],
    ['C/BB', 'C/Bb'],
    ['EMAJ7', 'Emaj7'],
    ['Dsus4', 'Dsus4'],
    ['h7', 'H7'],
  ])('reads "%s" as "%s"', (typed, symbol) => {
    expect(readTypedChord(typed)).toBe(symbol)
  })

  it('reads nothing typed as nothing', () => {
    expect(readTypedChord('   ')).toBe('')
  })
})

describe('chordSymbolOf', () => {
  it('offers the qualities in order, Major first', () => {
    expect(CHORD_QUALITIES).toEqual(['', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', 'dim', 'aug'])
  })

  it.each([
    ['A', 'm', 'Am'],
    ['A', '', 'A'],
    ['F#', 'maj7', 'F#maj7'],
  ])('builds %s with "%s" as %s', (root, quality, symbol) => {
    expect(chordSymbolOf(root, quality)).toBe(symbol)
  })
})
