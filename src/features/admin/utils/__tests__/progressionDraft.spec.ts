import { describe, expect, it } from 'vitest'

import {
  barsLabel,
  drillsRefusal,
  numeralsOf,
  readBars,
  sameNumerals,
  spelledBars,
  spellingKey,
} from '@/features/admin/utils/progressionDraft'

const progression = (mode: 'major' | 'minor', bars: string[]) => ({ key: bars.join('-'), mode, bars })

describe('readBars', () => {
  it('reads one bar per word, whatever separates them, and keeps what was written', () => {
    const bars = readBars(' I bVII–IV - I ', 'major')

    expect(bars.map((b) => b.written)).toEqual(['I', 'bVII', 'IV', 'I'])
    expect(bars.map((b) => b.parsed?.numeral)).toEqual(['I', '♭VII', 'IV', 'I'])
  })

  it('marks what is no chord and what is borrowed, in the mode', () => {
    const [bad, borrowed] = readBars('Vx bII', 'minor')

    expect(bad?.parsed).toBeNull()
    expect(borrowed?.parsed?.borrowed).toBe(true)
  })

  it('reads nothing from nothing', () => {
    expect(readBars('   ', 'major')).toEqual([])
  })
})

describe('numeralsOf', () => {
  it('gives a search that reads as numerals in their stored form', () => {
    expect(numeralsOf('I bVII IV')).toEqual(['I', '♭VII', 'IV'])
  })

  it('gives null for a name, or for nothing', () => {
    expect(numeralsOf('bossa')).toBeNull()
    expect(numeralsOf('I bossa')).toBeNull()
    expect(numeralsOf('')).toBeNull()
  })
})

describe('barsLabel', () => {
  it('joins numerals as a progression is named', () => {
    expect(barsLabel(['I', '♭VII', 'IV'])).toBe('I–♭VII–IV')
  })
})

describe('spellingKey', () => {
  it.each([
    ['G', 'major', { root: 7, name: 'G', chartKey: 'G', relative: false }],
    ['Em', 'minor', { root: 4, name: 'E', chartKey: 'Em', relative: false }],
    ['G', 'minor', { root: 4, name: 'E', chartKey: 'G', relative: true }],
    ['Em', 'major', { root: 7, name: 'G', chartKey: 'Em', relative: true }],
    ['C', 'minor', { root: 9, name: 'A', chartKey: 'C', relative: true }],
    [' F#m ', 'major', { root: 9, name: 'A', chartKey: 'F#m', relative: true }],
  ] as const)('%s for a %s progression', (chartKey, mode, expected) => {
    expect(spellingKey(chartKey, mode)).toEqual(expected)
  })

  it('is null without a key the chart can be spelled in', () => {
    expect(spellingKey(null, 'major')).toBeNull()
    expect(spellingKey('  ', 'major')).toBeNull()
    expect(spellingKey('H', 'major')).toBeNull()
  })
})

describe('spelledBars', () => {
  it('spells each bar on the key, borrowed chords and sevenths included', () => {
    const bars = readBars('I bVII IV Imaj7', 'major').flatMap((b) => (b.parsed ? [b.parsed] : []))

    expect(spelledBars(7, bars)).toBe('G – F – C – Gmaj7')
  })

  it('spells a minor progression on its own tonic', () => {
    const bars = readBars('i bVI bII V', 'minor').flatMap((b) => (b.parsed ? [b.parsed] : []))

    expect(spelledBars(4, bars)).toBe('Em – C – F – B')
  })
})

describe('sameNumerals', () => {
  it('finds a progression with these numerals in this mode, however the catalog spells them', () => {
    const list = [progression('major', ['I', 'V', 'vi', 'IV']), progression('major', ['ii', 'V', 'viio'])]

    expect(sameNumerals(list, 'major', ['I', 'V', 'vi', 'IV'])).toBe(list[0])
    expect(sameNumerals(list, 'major', ['ii', 'V', 'vii°'])).toBe(list[1])
  })

  it('tells modes, order and spelled twins apart', () => {
    const list = [progression('major', ['I', '♭VII'])]

    expect(sameNumerals(list, 'minor', ['I', '♭VII'])).toBeUndefined()
    expect(sameNumerals(list, 'major', ['♭VII', 'I'])).toBeUndefined()
    expect(sameNumerals(list, 'major', ['I', '♯VI'])).toBeUndefined()
  })
})

describe('drillsRefusal', () => {
  it.each([
    ['major', 4, null],
    ['major', 12, null],
    ['major', 0, null],
    ['major', 3, 'bars'],
    ['major', 16, 'bars'],
    ['minor', 4, 'minor'],
    ['minor', 3, 'minor'],
  ] as const)('%s with %i bars', (mode, count, expected) => {
    expect(drillsRefusal(mode, count)).toBe(expected)
  })
})
