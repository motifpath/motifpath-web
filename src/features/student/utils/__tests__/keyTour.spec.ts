import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { TOUR_ORDER, afterTake, tourStart, tourTempoIn, tourWindow } from '@/features/student/utils/keyTour'
import type { TourState } from '@/features/student/utils/keyTour'

type Tour = components['schemas']['PlannedProgressionKeys']
type MusicKey = components['schemas']['MusicKey']

const limits = { target: 100, min: 60 }

function at(key: MusicKey, speed: number, clean: MusicKey[] = []): TourState {
  return { key, speed, clean }
}

function plan(overrides: Partial<Tour> = {}): Tour {
  return {
    layout_instrument_id: '00000000-0000-4000-8000-0000000000a1',
    progression: { key: 'I-V-vi-IV', name: 'I–V–vi–IV (pop)' },
    times_through: 4,
    takes: 3,
    start_music_key: 'C',
    tour_tempo_bpm: 60,
    start_note_value: 'quarters',
    target_tempo_bpm: 100,
    min_tempo_bpm: 60,
    keys: TOUR_ORDER.map((key) => ({ music_key: key, clean: false, chart: [], voicings: [], chord_tones: [] })),
    ...overrides,
  }
}

describe('afterTake', () => {
  it('moves a clean take to the next key at the same tempo', () => {
    const tenClean: MusicKey[] = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A']
    expect(afterTake(at('D', 80, tenClean), { rating: 'clean', bpm: 80 }, limits)).toEqual(at('G', 80, [...tenClean, 'D']))
  })

  it('skips the keys already clean', () => {
    expect(afterTake(at('C', 60, ['F', 'Bb']), { rating: 'clean', bpm: 60 }, limits)).toEqual(at('Eb', 60, ['C', 'F', 'Bb']))
  })

  it('keeps the key and the tempo after an almost take', () => {
    expect(afterTake(at('C', 60), { rating: 'almost', bpm: 60 }, limits)).toEqual(at('C', 60))
  })

  it('stays in the key 5 BPM slower after a struggle', () => {
    expect(afterTake(at('C', 70), { rating: 'struggled', bpm: 70 }, limits)).toEqual(at('C', 65))
  })

  it('never lowers the tour below its floor', () => {
    expect(afterTake(at('C', 60), { rating: 'struggled', bpm: 60 }, limits)).toEqual(at('C', 60))
  })

  it('leaves the tour alone after a struggle above its tempo, which explores', () => {
    expect(afterTake(at('C', 70), { rating: 'struggled', bpm: 90 }, limits)).toEqual(at('C', 70))
  })

  it('stays in the key after a clean take below the tour tempo', () => {
    expect(afterTake(at('C', 70), { rating: 'clean', bpm: 60 }, limits)).toEqual(at('C', 70))
  })

  it('counts a take at its effective speed', () => {
    expect(afterTake(at('C', 70), { rating: 'clean', bpm: 35, noteValue: 'eighths' }, limits)).toEqual(at('F', 70, ['C']))
  })

  it('starts the tour again at C, 5 BPM faster, when the last key is made clean', () => {
    const elevenClean = TOUR_ORDER.filter((key) => key !== 'G')
    expect(afterTake(at('G', 70, elevenClean), { rating: 'clean', bpm: 70 }, limits)).toEqual(at('C', 75))
  })

  it('never climbs past the target by itself', () => {
    const elevenClean = TOUR_ORDER.filter((key) => key !== 'G')
    expect(afterTake(at('G', 100, elevenClean), { rating: 'clean', bpm: 100 }, limits)).toEqual(at('C', 100))
  })
})

describe('tourStart', () => {
  it('starts at the planned key and tempo, with the keys the plan says are clean', () => {
    const keys = plan().keys.map((k) => ({ ...k, clean: k.music_key === 'C' || k.music_key === 'F' }))
    expect(tourStart(plan({ start_music_key: 'Bb', tour_tempo_bpm: 70, keys }))).toEqual(at('Bb', 70, ['C', 'F']))
  })

  it('reads a tempo planned in another note value at its effective speed', () => {
    expect(tourStart(plan({ tour_tempo_bpm: 35, start_note_value: 'eighths' })).speed).toBe(70)
  })
})

describe('tourTempoIn', () => {
  it('plays the tour tempo in a note value, rounded up so the take is never slower', () => {
    expect(tourTempoIn(at('C', 70), 'quarters')).toBe(70)
    expect(tourTempoIn(at('C', 70), 'eighths')).toBe(35)
    expect(tourTempoIn(at('C', 70), 'triplets')).toBe(24)
  })
})

describe('tourWindow', () => {
  it('shows five keys of the cycle around the current one', () => {
    expect(tourWindow('Bb')).toEqual(['C', 'F', 'Bb', 'Eb', 'Ab'])
  })

  it('wraps around the cycle', () => {
    expect(tourWindow('C')).toEqual(['D', 'G', 'C', 'F', 'Bb'])
    expect(tourWindow('G')).toEqual(['A', 'D', 'G', 'C', 'F'])
  })
})
