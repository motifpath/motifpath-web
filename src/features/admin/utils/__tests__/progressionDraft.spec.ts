import { describe, expect, it } from 'vitest'

import {
  barsContain,
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
    ['G', 'major', { name: 'G', chartKey: 'G', relative: false }],
    ['Gb', 'major', { name: 'Gb', chartKey: 'Gb', relative: false }],
    ['C#', 'major', { name: 'C#', chartKey: 'C#', relative: false }],
    ['Em', 'minor', { name: 'E', chartKey: 'Em', relative: false }],
    ['G', 'minor', { name: 'E', chartKey: 'G', relative: true }],
    ['Em', 'major', { name: 'G', chartKey: 'Em', relative: true }],
    ['C', 'minor', { name: 'A', chartKey: 'C', relative: true }],
    ['Eb', 'minor', { name: 'C', chartKey: 'Eb', relative: true }],
    ['E', 'minor', { name: 'C#', chartKey: 'E', relative: true }],
    ['Bbm', 'major', { name: 'Db', chartKey: 'Bbm', relative: true }],
    [' F#m ', 'major', { name: 'A', chartKey: 'F#m', relative: true }],
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
  const parsed = (text: string, mode: 'major' | 'minor' = 'major') => readBars(text, mode).flatMap((b) => (b.parsed ? [b.parsed] : []))

  it.each([
    ['G', 'I bVII IV Imaj7', 'G – F – C – Gmaj7'],
    ['E', 'I iii vi V', 'E – G#m – C#m – B'],
    ['A', 'I iii vi', 'A – C#m – F#m'],
    ['F#', 'I IV V', 'F# – B – C#'],
    ['Gb', 'I IV V', 'Gb – Cb – Db'],
    ['C', 'bIII #IV bVI', 'Eb – F# – Ab'],
    ['F', 'I bVII', 'F – Eb'],
  ])('spells each bar from the key: %s, %s', (tonic, typed, expected) => {
    expect(spelledBars(tonic, parsed(typed))).toBe(expected)
  })

  it('spells a minor progression on its own tonic', () => {
    expect(spelledBars('E', parsed('i bVI bII V', 'minor'))).toBe('Em – C – F – B')
  })

  it('falls back to the catalog’s spelling rather than a double accidental', () => {
    expect(spelledBars('Gb', parsed('bIII'))).toBe('A')
  })
})

describe('barsContain', () => {
  const bars = ['I', 'V', 'vi', 'IV']

  it('finds numerals in a row in the bars, the whole run or part of it', () => {
    expect(barsContain(bars, 'major', ['I', 'V', 'vi', 'IV'])).toBe(true)
    expect(barsContain(bars, 'major', ['vi', 'IV'])).toBe(true)
  })

  it('needs them in order and whole: V is not vi, nor I part of IV', () => {
    expect(barsContain(bars, 'major', ['IV', 'I'])).toBe(false)
    expect(barsContain(['IV'], 'major', ['I'])).toBe(false)
    expect(barsContain(['V7'], 'major', ['V'])).toBe(false)
  })

  it('reads the catalog’s spelling of a numeral as the typed one', () => {
    expect(barsContain(['ii', 'viio'], 'major', ['vii°'])).toBe(true)
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
    [0, null],
    [1, 'bars'],
    [2, null],
    [3, null],
    [4, null],
    [8, null],
    [16, null],
  ] as const)('%i bars, in either mode', (count, expected) => {
    expect(drillsRefusal(count)).toBe(expected)
  })
})
