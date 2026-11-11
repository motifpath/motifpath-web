import { describe, expect, it } from 'vitest'
import golden from '@/api/generated/golden/progression-numerals/progression_numeral.v1.json'
import { parseProgressionNumeral } from '@/shared/utils/progressionNumeral'
import type { ProgressionMode } from '@/shared/utils/progressionNumeral'

const modeOf = (mode: string): ProgressionMode => (mode === 'minor' ? 'minor' : 'major')

describe('parseProgressionNumeral against the progression_numeral.v1 golden cases', () => {
  it.each(golden.cases.map((c) => [c.name, c] as const))('%s', (_name, { input, mode, expected }) => {
    const parsed = parseProgressionNumeral(input, modeOf(mode))
    if (expected.status === 'unparsed') {
      expect(parsed).toBeNull()
      return
    }
    expect(parsed).toEqual({
      numeral: expected.numeral,
      rootSemitones: expected.root_semitones,
      quality: expected.quality,
      borrowed: expected.borrowed,
    })
  })
})
