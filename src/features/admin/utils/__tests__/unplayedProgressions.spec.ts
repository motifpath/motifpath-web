import { describe, expect, it } from 'vitest'

import { unplayedProgressions } from '@/features/admin/utils/unplayedProgressions'
import { makeAnchor, makeLyricLine, makeSection } from '@/shared/testUtils/songChart'

const verse = makeSection([makeLyricLine(['Ciranda', makeAnchor('a1', 'C')])], { progression_keys: ['I-IV-V-I', 'I-IV-I-V'] })
const chorus = makeSection([makeLyricLine(['O anel', makeAnchor('a2', 'G7')])], { kind: 'chorus', progression_keys: ['I-V-vi-IV'] })
const saved = {
  body: { type: 'doc' as const, content: [verse, chorus] },
  unplayed_progressions: [
    { section_index: 0, progression_key: 'I-IV-V-I' },
    { section_index: 1, progression_key: 'I-V-vi-IV' },
  ],
}

describe('unplayedProgressions', () => {
  it('gives the tags the last save found unplayed while the lyrics are as saved', () => {
    expect(unplayedProgressions(saved.body, saved)).toEqual(saved.unplayed_progressions)
  })

  it('drops a tag removed from its section since, so removing it clears the warning at once', () => {
    const untagged = { ...chorus, attrs: { ...chorus.attrs, progression_keys: [] } }

    expect(unplayedProgressions({ type: 'doc', content: [verse, untagged] }, saved)).toEqual([{ section_index: 0, progression_key: 'I-IV-V-I' }])
  })

  it('gives none while sections were added or removed since, as it can no longer tell which section was meant', () => {
    const intro = makeSection([makeLyricLine(['La', makeAnchor('a3', 'C')])], { kind: 'intro', progression_keys: ['I-IV-V-I'] })

    expect(unplayedProgressions({ type: 'doc', content: [intro, verse, chorus] }, saved)).toEqual([])
  })

  it('gives none for a chart never saved', () => {
    expect(unplayedProgressions(saved.body, null)).toEqual([])
  })
})
