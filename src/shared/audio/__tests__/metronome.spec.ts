import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMetronome } from '../metronome'
import type { MetronomeSettings } from '../metronome'
import type { ClickLevel, ClickSink } from '../playbackRun'

/** A clock the test moves along with the fake timers, and a sink that records its clicks. */
function setup() {
  let time = 10
  const clicks: { time: number; level: ClickLevel }[] = []
  const sink: ClickSink = {
    click: (click) => {
      clicks.push(click)
      return () => {}
    },
    stopAll: vi.fn(),
  }
  const metronome = createMetronome({ now: () => time, sink })
  function advance(seconds: number) {
    time += seconds
    vi.advanceTimersByTime(seconds * 1000)
  }
  /** The clicks so far, timed from the first one. */
  function heard(count: number) {
    const first = clicks[0]!.time
    return clicks.slice(0, count).map((c) => [+(c.time - first).toFixed(3), c.level])
  }
  return { metronome, clicks, sink, advance, heard, now: () => time }
}

const FOUR_FOUR: MetronomeSettings = { bpm: 120, beats: 4, beatValue: 4, noteValue: 'quarters' }

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createMetronome', () => {
  it('clicks every beat of the bar at the tempo, the downbeat louder', () => {
    const { metronome, advance, heard } = setup()

    metronome.start(FOUR_FOUR)
    advance(3)

    expect(heard(5)).toEqual([
      [0, 'downbeat'],
      [0.5, 'beat'],
      [1, 'beat'],
      [1.5, 'beat'],
      [2, 'downbeat'],
    ])
  })

  it('starts on the next moment the audio can still be scheduled', () => {
    const { metronome, clicks } = setup()

    metronome.start(FOUR_FOUR)

    expect(clicks[0]!.time).toBeGreaterThanOrEqual(10)
    expect(clicks[0]!.time).toBeLessThan(10.2)
  })

  it('clicks twice a beat in eighths, each beat louder than the click between beats', () => {
    const { metronome, advance, heard } = setup()

    metronome.start({ ...FOUR_FOUR, noteValue: 'eighths' })
    advance(3)

    expect(heard(9)).toEqual([
      [0, 'downbeat'],
      [0.25, 'between'],
      [0.5, 'beat'],
      [0.75, 'between'],
      [1, 'beat'],
      [1.25, 'between'],
      [1.5, 'beat'],
      [1.75, 'between'],
      [2, 'downbeat'],
    ])
  })

  it('clicks three times a beat in triplets', () => {
    const { metronome, advance, heard } = setup()

    metronome.start({ ...FOUR_FOUR, bpm: 60, noteValue: 'triplets' })
    advance(2)

    expect(heard(4).map(([time]) => time)).toEqual([0, 0.333, 0.667, 1])
  })

  it('clicks on beats 1 and 3 of each bar in halves', () => {
    const { metronome, advance, heard } = setup()

    metronome.start({ ...FOUR_FOUR, noteValue: 'halves' })
    advance(3)

    expect(heard(3)).toEqual([
      [0, 'downbeat'],
      [1, 'beat'],
      [2, 'downbeat'],
    ])
  })

  it('starts every bar with a click in halves, even a bar of an odd number of beats', () => {
    const { metronome, advance, heard } = setup()

    metronome.start({ ...FOUR_FOUR, beats: 3, noteValue: 'halves' })
    advance(3)

    expect(heard(3)).toEqual([
      [0, 'downbeat'],
      [1, 'beat'],
      [1.5, 'downbeat'],
    ])
  })

  it('accents each dotted-quarter group of a compound bar', () => {
    const { metronome, advance, heard } = setup()

    metronome.start({ ...FOUR_FOUR, beats: 6, beatValue: 8 })
    advance(4)

    expect(heard(7).map(([, level]) => level)).toEqual(['downbeat', 'between', 'between', 'beat', 'between', 'between', 'downbeat'])
  })

  it('applies a new tempo from the next beat, without stopping', () => {
    const { metronome, clicks, advance } = setup()
    metronome.start({ ...FOUR_FOUR, bpm: 60 })
    advance(1.5)

    metronome.update({ ...FOUR_FOUR, bpm: 120 })
    advance(2)

    const times = clicks.map((c) => c.time)
    const gaps = times.slice(1).map((t, i) => +(t - times[i]!).toFixed(3))
    expect(gaps.slice(0, 2)).toEqual([1, 1])
    expect(gaps.slice(-3)).toEqual([0.5, 0.5, 0.5])
    expect(metronome.running()).toBe(true)
  })

  it('applies a new bar from the next beat', () => {
    const { metronome, clicks, advance } = setup()
    metronome.start({ ...FOUR_FOUR, bpm: 60 })
    advance(0.5)

    metronome.update({ ...FOUR_FOUR, bpm: 60, beats: 3 })
    advance(8)

    const downbeats = clicks.filter((c) => c.level === 'downbeat').map((c) => c.time - clicks[0]!.time)
    expect(downbeats.slice(0, 3)).toEqual([0, 3, 6])
  })

  it('says which beat of the bar is sounding', () => {
    const { metronome, clicks, advance } = setup()
    metronome.start(FOUR_FOUR)
    advance(1)

    const second = clicks.find((c) => c.level === 'beat')!.time
    expect(metronome.beatAt(second + 0.01)).toBe(1)
    expect(metronome.beatAt(clicks[0]!.time + 0.01)).toBe(0)
    expect(metronome.beatAt(clicks[0]!.time - 0.01)).toBeNull()
  })

  it('stops clicking, silencing the clicks already scheduled', () => {
    const { metronome, clicks, sink, advance } = setup()
    metronome.start(FOUR_FOUR)
    advance(1)

    metronome.stop()
    const count = clicks.length
    advance(3)

    expect(sink.stopAll).toHaveBeenCalled()
    expect(clicks).toHaveLength(count)
    expect(metronome.running()).toBe(false)
    expect(metronome.beatAt(100)).toBeNull()
  })
})
