import type { ClickSink } from '@/shared/audio/playbackRun'

/**
 * Wraps a metronome's click sink to keep each click's time and its beat of the bar, counted from
 * each downbeat, so a player can say which beat is sounding at any moment of the audio clock for
 * the beat dots. A click cancelled before it sounds is forgotten.
 */
export function createClickCounter(inner: ClickSink) {
  /** The clicks scheduled, in time order, each with its beat of the bar. */
  let clicks: { time: number; beat: number }[] = []
  let beatOfBar = 0

  const sink: ClickSink = {
    click(at) {
      beatOfBar = at.level === 'downbeat' ? 0 : beatOfBar + 1
      const entry = { time: at.time, beat: beatOfBar }
      clicks.push(entry)
      const cancel = inner.click(at)
      return () => {
        clicks = clicks.filter((c) => c !== entry)
        cancel()
      }
    },
    stopAll: () => inner.stopAll(),
  }

  /** The beat of the latest click at or before `time`; null before the first. */
  function beatAt(time: number): number | null {
    for (let i = clicks.length - 1; i >= 0; i--) if (clicks[i]!.time <= time) return clicks[i]!.beat
    return null
  }

  function clear() {
    clicks = []
    beatOfBar = 0
  }

  return { sink, beatAt, clear }
}
