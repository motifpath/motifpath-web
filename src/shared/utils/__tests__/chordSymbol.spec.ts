import { describe, expect, it } from 'vitest'

import { readChordSymbol } from '@/shared/utils/chordSymbol'
import golden from '@/api/generated/golden/chord-symbols/chord_symbol.v1.json'

// The server reads chord symbols the same way; these shared cases keep the feedback an author
// sees while typing in agreement with what the server stores and finds in the catalog.
describe('readChordSymbol against the chord_symbol.v1 golden cases', () => {
  const cases = golden.cases.map(({ name, input, expected }) => ({
    name,
    input,
    expected: {
      status: expected.status,
      parsed: 'parsed' in expected ? expected.parsed : null,
      warning: 'warning' in expected ? expected.warning : null,
    },
  }))

  it('has cases to run', () => {
    expect(cases.length).toBeGreaterThan(0)
  })

  it.each(cases)('$name', ({ input, expected }) => {
    expect(readChordSymbol(input)).toEqual(expected)
  })
})
