import { describe, expect, it } from 'vitest'

import { publishBlockers } from '@/features/admin/utils/publishBlockers'
import type { ChordCheck } from '@/shared/utils/chordCheck'
import { makeAnchor, makeLyricLine, makeSection } from '@/shared/testUtils/songChart'

const checks: Record<string, ChordCheck> = {
  G: { kind: 'ok', blocks: false, chord: null },
  H7: { kind: 'not_a_chord', blocks: true, chord: null },
  'C#7': { kind: 'not_in_catalog', blocks: true, chord: null },
  'N.C.': { kind: 'no_chord', blocks: false, chord: null },
}
const checkOf = (symbol: string) => checks[symbol] ?? null

const body = {
  type: 'doc' as const,
  content: [
    makeSection(
      [
        makeLyricLine(['Ciranda, ', makeAnchor('a1', 'G')], ['cirandinha', makeAnchor('a2', 'N.C.')]),
        { type: 'comment' as const, content: [{ type: 'text' as const, text: 'Mais devagar' }] },
        makeLyricLine(['vamos todos ', makeAnchor('a3', 'H7')]),
      ],
      { kind: 'verse', label: null },
    ),
    makeSection([makeLyricLine(['ciranda', makeAnchor('a4', 'C#7')])], { kind: 'chorus', label: 'Refrão' }),
  ],
}

describe('publishBlockers', () => {
  it('lists the rights first, then each chord that blocks, with its section and lyric line', () => {
    expect(publishBlockers(body, false, checkOf)).toEqual([
      { kind: 'rights' },
      { kind: 'chord', anchorId: 'a3', symbol: 'H7', problem: 'not_a_chord', section: { kind: 'verse', label: null, progression_keys: [] }, line: 2 },
      { kind: 'chord', anchorId: 'a4', symbol: 'C#7', problem: 'not_in_catalog', section: { kind: 'chorus', label: 'Refrão', progression_keys: [] }, line: 1 },
    ])
  })

  it("lists each tag a section doesn't play after the chords, naming the section", () => {
    const unplayed = [{ section_index: 1, progression_key: 'I-IV-V-I' }]

    expect(publishBlockers(body, true, checkOf, unplayed).slice(-1)).toEqual([
      { kind: 'progression', progressionKey: 'I-IV-V-I', section: { kind: 'chorus', label: 'Refrão', progression_keys: [] } },
    ])
  })

  it('has nothing to list when the rights are confirmed and every chord is fine', () => {
    const fine = { type: 'doc' as const, content: [makeSection([makeLyricLine(['Ciranda', makeAnchor('a1', 'G')])])] }

    expect(publishBlockers(fine, true, checkOf)).toEqual([])
  })

  it("doesn't list a chord the catalog hasn't answered for yet", () => {
    const unknown = { type: 'doc' as const, content: [makeSection([makeLyricLine(['Ciranda', makeAnchor('a1', 'Dm')])])] }

    expect(publishBlockers(unknown, true, checkOf)).toEqual([])
  })
})
