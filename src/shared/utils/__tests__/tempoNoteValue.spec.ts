import { describe, expect, it } from 'vitest'

import {
  ALL_NOTE_VALUES,
  SUGGESTED_NOTE_VALUES,
  effectiveSpeed,
  keepEffectiveSpeed,
  speedFactor,
} from '../tempoNoteValue'

describe('speedFactor', () => {
  it.each([
    ['halves', 0.5],
    ['quarters', 1],
    ['eighths', 2],
    ['triplets', 3],
    ['sixteenths', 4],
    ['quintuplets', 5],
    ['sextuplets', 6],
    ['thirty_seconds', 8],
  ] as const)('plays %s at ×%s the music as written', (value, factor) => {
    expect(speedFactor(value)).toBe(factor)
  })
})

describe('effectiveSpeed', () => {
  it('is the BPM times the factor, in quarter-note BPM', () => {
    expect(effectiveSpeed(80, 'eighths')).toBe(160)
    expect(effectiveSpeed(80, 'sixteenths')).toBe(320)
    expect(effectiveSpeed(100, 'halves')).toBe(50)
  })
})

describe('keepEffectiveSpeed', () => {
  it('keeps the effective speed in another note value', () => {
    expect(keepEffectiveSpeed(160, 'quarters', 'eighths')).toBe(80)
    expect(keepEffectiveSpeed(80, 'eighths', 'quarters')).toBe(160)
  })

  it('rounds down to the 5 BPM grid', () => {
    expect(keepEffectiveSpeed(155, 'quarters', 'triplets')).toBe(50)
  })
})

describe('the note values offered', () => {
  it('suggests quarters, eighths, triplets and sixteenths', () => {
    expect(SUGGESTED_NOTE_VALUES).toEqual(['quarters', 'eighths', 'triplets', 'sixteenths'])
  })

  it('lists every value from the slowest to the fastest', () => {
    expect(ALL_NOTE_VALUES).toEqual([
      'halves',
      'quarters',
      'eighths',
      'triplets',
      'sixteenths',
      'quintuplets',
      'sextuplets',
      'thirty_seconds',
    ])
  })
})
