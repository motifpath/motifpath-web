import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { chordCheck, localChordCheck } from '@/shared/utils/chordCheck'
import { chordC, makeChord } from '@/shared/testUtils/songChart'

type ChordSearchResult = components['schemas']['ChordSearchResult']

function result(overrides: Partial<ChordSearchResult>): ChordSearchResult {
  return { written_symbol: 'C', status: 'parsed', parsed: null, warning: null, chord: null, chord_without_bass: null, ...overrides }
}

describe('localChordCheck', () => {
  it.each([
    ['H7', { kind: 'not_a_chord', blocks: true }],
    ['C7#11', { kind: 'unsupported', blocks: true }],
    ['N.C.', { kind: 'no_chord', blocks: false }],
    ['', { kind: 'not_a_chord', blocks: true }],
    ['G'.repeat(33), { kind: 'not_a_chord', blocks: true }],
  ])('reads %j without the catalog', (symbol, want) => {
    expect(localChordCheck(symbol)).toEqual({ ...want, chord: null })
  })

  it('leaves a chord that parses to the catalog', () => {
    expect(localChordCheck('Gmaj7')).toBeNull()
  })
})

describe('chordCheck', () => {
  it('is fine when the catalog has the chord with voicings', () => {
    expect(chordCheck(result({ chord: chordC }))).toEqual({ kind: 'ok', blocks: false, chord: chordC })
  })

  it("blocks a chord the catalog doesn't have", () => {
    expect(chordCheck(result({}))).toEqual({ kind: 'not_in_catalog', blocks: true, chord: null })
  })

  it('blocks a catalog chord with no voicing', () => {
    expect(chordCheck(result({ chord: makeChord('chord-am', 'Am', []) }))).toEqual({ kind: 'not_in_catalog', blocks: true, chord: null })
  })

  it("shows a slash chord the catalog lacks with the chord without its bass, which doesn't block", () => {
    expect(chordCheck(result({ written_symbol: 'C/B', chord_without_bass: chordC }))).toEqual({ kind: 'without_bass', blocks: false, chord: chordC })
  })
})
