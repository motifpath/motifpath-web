import { describe, expect, it } from 'vitest'

import { makeAnchor, makeChord, makeLyricLine, makeVoicing } from '@/shared/testUtils/songChart'
import { lineSegments, missingBass, openingVoicing, voicingNames } from '@/shared/utils/songChartReading'

const anchor = makeAnchor
const line = makeLyricLine
const voicing = (id: string) => makeVoicing(id, 'chord-c')

describe('lineSegments', () => {
  it('puts each chord on the first word of its run, and the run\'s other words on their own', () => {
    const g = anchor('a1', 'G')
    const c = anchor('a2', 'C')

    const segments = lineSegments(line(['Quando olhei a ', g], ['terra ardendo', c]))

    expect(segments).toEqual([
      { text: 'Quando ', anchor: g },
      { text: 'olhei ', anchor: null },
      { text: 'a ', anchor: null },
      { text: 'terra ', anchor: c },
      { text: 'ardendo', anchor: null },
    ])
  })

  it('keeps text before the first chord, and a chord anchored to a single space', () => {
    const c = anchor('a1', 'C')
    const g = anchor('a2', 'G')

    expect(lineSegments(line(['I ', null], ['love you', c], [' ', g]))).toEqual([
      { text: 'I ', anchor: null },
      { text: 'love ', anchor: c },
      { text: 'you', anchor: null },
      { text: ' ', anchor: g },
    ])
  })

  it('keeps a chord inside a word on the rest of that word', () => {
    const c = anchor('a1', 'C')

    expect(lineSegments(line(['Hel', null], ['lo there', c]))).toEqual([
      { text: 'Hel', anchor: null },
      { text: 'lo ', anchor: c },
      { text: 'there', anchor: null },
    ])
  })
})

describe('openingVoicing', () => {
  const best = voicing('c-open')
  const other = voicing('c-barre-3')
  const c = makeChord('chord-c', 'C', [best, other])

  it("opens on the author's pick", () => {
    expect(openingVoicing(c, anchor('a1', 'C', { chordVoicingId: 'c-barre-3' }))).toBe(other)
  })

  it('opens on the best voicing without a pick', () => {
    expect(openingVoicing(c, anchor('a1', 'C'))).toBe(best)
  })

  it('opens on the best voicing when the pick is no longer among the voicings', () => {
    expect(openingVoicing(c, anchor('a1', 'C', { chordVoicingId: 'gone' }))).toBe(best)
  })

  it('has nothing to open on a chord without voicings', () => {
    expect(openingVoicing(makeChord('chord-c', 'C', []), anchor('a1', 'C'))).toBeNull()
  })
})

describe('missingBass', () => {
  it('names the written bass of a slash chord resolved without it', () => {
    expect(missingBass(anchor('a1', 'C/G'), makeChord('chord-c', 'C', []))).toBe('G')
  })

  it('is null when the catalog chord has the bass', () => {
    expect(missingBass(anchor('a1', 'D/F#'), makeChord('chord-d-over-f-sharp', 'D/F#', [], { bass: 'F#' }))).toBeNull()
  })

  it('is null for a chord written without a bass', () => {
    expect(missingBass(anchor('a1', 'C'), makeChord('chord-c', 'C', []))).toBeNull()
  })
})

describe('voicingNames', () => {
  const at = (id: string, lowest: number) => makeVoicing(id, 'chord-g', { fret_window: { lowest_fret: lowest, highest_fret: lowest + 3 } })

  it('names a voicing by where it sits: open, or the fret it starts on', () => {
    expect(voicingNames([at('g-open', 0), at('g-3', 3), at('g-10', 10)], 'Open')).toEqual(['Open', '3fr', '10fr'])
  })

  it('numbers voicings that sit at the same place, so each name is its own', () => {
    expect(voicingNames([at('g-open', 0), at('g-3a', 3), at('g-3b', 3)], 'Open')).toEqual(['Open', '3fr', '3fr · 2'])
  })
})
