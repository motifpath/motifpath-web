import { describe, expect, it } from 'vitest'

import { createPlaybackRun } from '../playbackRun'
import type { NoteSink } from '../playbackRun'
import type { PlaybackStep } from '../timeline'

/** Records what the run schedules, and which of it was cancelled. */
function fakeSink() {
  const played: { midi: number; time: number; duration: number; cancelled: boolean }[] = []
  let stoppedAll = false
  const sink: NoteSink = {
    play(note) {
      const entry = { ...note, cancelled: false }
      played.push(entry)
      return () => {
        entry.cancelled = true
      }
    },
    stopAll() {
      stoppedAll = true
    },
  }
  return {
    sink,
    played,
    sounding: () => played.filter((n) => !n.cancelled).map((n) => [n.midi, n.time]),
    stoppedAll: () => stoppedAll,
  }
}

function note(positionId: string, midi: number): PlaybackStep {
  return { value: 1 / 4, positionIds: [positionId], notes: [{ positionId, midi, offset: 0 }] }
}

// Three quarter notes; a whole note of 4 s makes each one second.
const STEPS = [note('a', 60), note('b', 62), note('c', 64)]

describe('createPlaybackRun', () => {
  it('schedules every note of the run from its start time', () => {
    const { sink, sounding } = fakeSink()
    createPlaybackRun(STEPS, { sink, wholeSeconds: 4, loop: false, startAt: 10 })
    expect(sounding()).toEqual([
      [60, 10],
      [62, 11],
      [64, 12],
    ])
  })

  it('lights up the positions of the step sounding at a time, and none before or after', () => {
    const { sink } = fakeSink()
    const run = createPlaybackRun(STEPS, { sink, wholeSeconds: 4, loop: false, startAt: 10 })
    expect(run.activePositionIds(9.9)).toEqual([])
    expect(run.activePositionIds(10)).toEqual(['a'])
    expect(run.activePositionIds(11.5)).toEqual(['b'])
    expect(run.activePositionIds(13)).toEqual([])
  })

  it('finishes when the last step ends, unless it loops', () => {
    const once = createPlaybackRun(STEPS, { sink: fakeSink().sink, wholeSeconds: 4, loop: false, startAt: 10 })
    expect(once.finished(12.9)).toBe(false)
    expect(once.finished(13)).toBe(true)

    const looping = createPlaybackRun(STEPS, { sink: fakeSink().sink, wholeSeconds: 4, loop: true, startAt: 10 })
    looping.update(13)
    expect(looping.finished(13)).toBe(false)
  })

  it('a loop stays one run ahead: the next run is scheduled when the current one starts', () => {
    const { sink, sounding } = fakeSink()
    const run = createPlaybackRun(STEPS, { sink, wholeSeconds: 4, loop: true, startAt: 10 })
    expect(sounding()).toHaveLength(3)

    run.update(10)
    expect(sounding().slice(3)).toEqual([
      [60, 13],
      [62, 14],
      [64, 15],
    ])
    run.update(12)
    expect(sounding()).toHaveLength(6)

    run.update(13)
    expect(sounding()).toHaveLength(9)
    expect(run.activePositionIds(13.5)).toEqual(['a'])
  })

  it('after a long gap between updates (a background tab), skips the missed passes instead of replaying them', () => {
    const { sink, sounding } = fakeSink()
    const run = createPlaybackRun(STEPS, { sink, wholeSeconds: 4, loop: true, startAt: 10 })
    run.update(10)
    const before = sounding().length

    run.update(100)
    run.update(100.016)
    const resumed = sounding().slice(before)
    expect(resumed.every(([, time]) => time! >= 100)).toBe(true)
    expect(resumed).toHaveLength(3)
    expect(run.activePositionIds(resumed[0]![1]!)).toEqual(['a'])
  })

  it('a new tempo after a long gap starts the next pass just ahead of now, not in the past', () => {
    const { sink, sounding } = fakeSink()
    const run = createPlaybackRun(STEPS, { sink, wholeSeconds: 4, loop: true, startAt: 10 })
    run.update(10)
    run.setWholeSeconds(2, 100)
    expect(sounding().filter(([, time]) => time! > 16).every(([, time]) => time! >= 100)).toBe(true)
    expect(sounding().filter(([, time]) => time! >= 100)).toHaveLength(3)
  })

  it('a new tempo applies from the next step; the sounding step keeps its length', () => {
    const { sink, sounding } = fakeSink()
    const run = createPlaybackRun(STEPS, { sink, wholeSeconds: 4, loop: false, startAt: 10 })
    run.setWholeSeconds(2, 10.5)
    expect(sounding()).toEqual([
      [60, 10],
      [62, 11],
      [64, 11.5],
    ])
    expect(run.finished(12)).toBe(true)
  })

  it('a new tempo before the first note re-times the whole run', () => {
    const { sink, sounding } = fakeSink()
    const run = createPlaybackRun(STEPS, { sink, wholeSeconds: 4, loop: false, startAt: 10 })
    run.setWholeSeconds(2, 9.95)
    expect(sounding()).toEqual([
      [60, 10],
      [62, 10.5],
      [64, 11],
    ])
  })

  it('a new tempo during the last step of a loop re-times the next run', () => {
    const { sink, sounding } = fakeSink()
    const run = createPlaybackRun(STEPS, { sink, wholeSeconds: 4, loop: true, startAt: 10 })
    run.update(10)
    run.setWholeSeconds(2, 12.5)
    expect(sounding().slice(3)).toEqual([
      [60, 13],
      [62, 13.5],
      [64, 14],
    ])
  })

  it('stop silences everything and lights nothing', () => {
    const { sink, stoppedAll, sounding } = fakeSink()
    const run = createPlaybackRun(STEPS, { sink, wholeSeconds: 4, loop: true, startAt: 10 })
    run.stop()
    expect(stoppedAll()).toBe(true)
    expect(sounding()).toEqual([])
    expect(run.activePositionIds(10.5)).toEqual([])
    expect(run.finished(10.5)).toBe(true)
  })

  describe('with a metronome', () => {
    /** Records the clicks the run schedules, and which were cancelled. */
    function fakeClicks() {
      const clicks: { time: number; accent: boolean; cancelled: boolean }[] = []
      let stoppedAll = false
      return {
        sink: {
          click(at: { time: number; accent: boolean }) {
            const entry = { ...at, cancelled: false }
            clicks.push(entry)
            return () => {
              entry.cancelled = true
            }
          },
          stopAll() {
            stoppedAll = true
          },
        },
        live: () => clicks.filter((c) => !c.cancelled).map((c) => [c.time, c.accent]),
        stoppedAll: () => stoppedAll,
      }
    }

    it('clicks every beat of the pass, the first beat of each bar accented', () => {
      const clicks = fakeClicks()
      createPlaybackRun(STEPS, {
        sink: fakeSink().sink,
        wholeSeconds: 4,
        loop: false,
        startAt: 10,
        metronome: { sink: clicks.sink, beat: 1 / 4, beatsPerBar: 2 },
      })

      expect(clicks.live()).toEqual([
        [10, true],
        [11, false],
        [12, true],
      ])
    })

    it('clicks on the beat grid, not on the notes', () => {
      const clicks = fakeClicks()
      const half: PlaybackStep = { value: 1 / 2, positionIds: ['h'], notes: [{ positionId: 'h', midi: 60, offset: 0 }] }
      createPlaybackRun([half], {
        sink: fakeSink().sink,
        wholeSeconds: 4,
        loop: false,
        startAt: 0,
        metronome: { sink: clicks.sink, beat: 1 / 4, beatsPerBar: 4 },
      })

      expect(clicks.live()).toEqual([
        [0, true],
        [1, false],
      ])
    })

    it('clicks the next pass of a loop as it is scheduled', () => {
      const clicks = fakeClicks()
      const run = createPlaybackRun(STEPS, {
        sink: fakeSink().sink,
        wholeSeconds: 4,
        loop: true,
        startAt: 10,
        metronome: { sink: clicks.sink, beat: 1 / 4, beatsPerBar: 3 },
      })
      run.update(10)

      expect(clicks.live()).toEqual([
        [10, true],
        [11, false],
        [12, false],
        [13, true],
        [14, false],
        [15, false],
      ])
    })

    it('re-times the clicks still to come when the tempo changes', () => {
      const clicks = fakeClicks()
      const run = createPlaybackRun(STEPS, {
        sink: fakeSink().sink,
        wholeSeconds: 4,
        loop: false,
        startAt: 10,
        metronome: { sink: clicks.sink, beat: 1 / 4, beatsPerBar: 4 },
      })
      run.setWholeSeconds(2, 10.5)

      expect(clicks.live()).toEqual([
        [10, true],
        [11, false],
        [11.5, false],
      ])
    })

    it('silences the clicks when it stops', () => {
      const clicks = fakeClicks()
      const run = createPlaybackRun(STEPS, {
        sink: fakeSink().sink,
        wholeSeconds: 4,
        loop: false,
        startAt: 10,
        metronome: { sink: clicks.sink, beat: 1 / 4, beatsPerBar: 4 },
      })
      run.stop()

      expect(clicks.live()).toEqual([])
      expect(clicks.stoppedAll()).toBe(true)
    })
  })
})

