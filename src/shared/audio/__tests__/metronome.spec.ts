import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMetronome } from '../metronome'
import type { ClickSink } from '../playbackRun'

/** A clock the test moves along with the fake timers, and a sink that records its clicks. */
function setup() {
  let time = 10
  const clicks: { time: number; accent: boolean }[] = []
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
  return { metronome, clicks, sink, advance }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createMetronome', () => {
  it('clicks on every beat at the tempo, accenting the first of each bar', () => {
    const { metronome, clicks, advance } = setup()

    metronome.start({ bpm: 120, beatsPerBar: 3 })
    advance(2)

    const beats = clicks.slice(0, 5)
    expect(beats.map((c) => c.time - beats[0]!.time)).toEqual([0, 0.5, 1, 1.5, 2])
    expect(beats.map((c) => c.accent)).toEqual([true, false, false, true, false])
  })

  it('starts on the next moment the audio can still be scheduled', () => {
    const { metronome, clicks } = setup()

    metronome.start({ bpm: 60, beatsPerBar: 4 })

    expect(clicks[0]!.time).toBeGreaterThanOrEqual(10)
    expect(clicks[0]!.time).toBeLessThan(10.2)
  })

  it('spaces the beats after a tempo change at the new tempo', () => {
    const { metronome, clicks, advance } = setup()
    metronome.start({ bpm: 60, beatsPerBar: 4 })
    advance(1.5)

    metronome.setTempo(120)
    const before = clicks.length
    advance(2)

    const after = clicks.slice(before - 1).map((c) => c.time)
    const gaps = after.slice(1).map((t, i) => t - after[i]!)
    expect(gaps.slice(1).every((gap) => Math.abs(gap - 0.5) < 1e-9)).toBe(true)
  })

  it('stops clicking, silencing the clicks already scheduled', () => {
    const { metronome, clicks, sink, advance } = setup()
    metronome.start({ bpm: 120, beatsPerBar: 4 })
    advance(1)

    metronome.stop()
    const count = clicks.length
    advance(3)

    expect(sink.stopAll).toHaveBeenCalled()
    expect(clicks).toHaveLength(count)
    expect(metronome.running()).toBe(false)
  })
})
