/**
 * One run of a diagram's playback: it hands every note to a sink (the
 * sampler) ahead of time, on the audio clock, and says which positions are
 * sounding at any moment of that clock. A looping run stays one pass ahead,
 * scheduling the next pass as the current one starts; a tempo change re-times
 * everything after the step now sounding. A metronome clicks on the beat grid
 * of each pass, on the same clock, so it never drifts from the notes.
 */
import { buildTimeline } from './timeline'
import type { PlaybackStep, StepSpan } from './timeline'

export interface NoteSink {
  /** Plays a note at `time` (audio-clock seconds); the returned function cancels it. */
  play(note: { midi: number; time: number; duration: number }): () => void
  /** Silences every note, sounding or scheduled. */
  stopAll(): void
}

export interface ClickSink {
  /** Clicks at `time` (audio-clock seconds), louder on an accent; the returned function cancels it. */
  click(at: { time: number; accent: boolean }): () => void
  /** Silences every click, sounding or scheduled. */
  stopAll(): void
}

/** A metronome over the run: a click every `beat` (a fraction of a whole note), the first of each bar accented. */
export interface RunMetronome {
  sink: ClickSink
  beat: number
  beatsPerBar: number
}

export interface PlaybackRun {
  /** Schedules the next pass of a loop once the current one has started. Call it as time passes. */
  update(now: number): void
  activePositionIds(at: number): string[]
  finished(at: number): boolean
  /** Re-times every step that starts after `now`. */
  setWholeSeconds(wholeSeconds: number, now: number): void
  stop(): void
}

/** How far ahead of the clock a pass starts when the previous one already ended, so it isn't late. */
const RESUME_LEAD_SECONDS = 0.1
/** Slack for adding up note lengths in floating point, far below any real note's length. */
const EPSILON = 1e-9

interface ScheduledStep extends StepSpan {
  pass: number
  cancels: (() => void)[]
}

export function createPlaybackRun(
  steps: PlaybackStep[],
  options: { sink: NoteSink; wholeSeconds: number; loop: boolean; startAt: number; metronome?: RunMetronome },
): PlaybackRun {
  const { sink, loop, startAt, metronome } = options
  let wholeSeconds = options.wholeSeconds
  let scheduled: ScheduledStep[] = []
  let stopped = false

  // Where each step starts within a pass, as a fraction of a whole note.
  const stepStarts = steps.reduce<number[]>((starts, step, i) => [...starts, starts[i]! + step.value], [0])

  /** Schedules the metronome's clicks that fall within step `stepIndex`, which starts at `time`. */
  function scheduleClicks(stepIndex: number, time: number): (() => void)[] {
    if (!metronome) return []
    const { beat, beatsPerBar } = metronome
    const from = stepStarts[stepIndex]!
    const to = stepStarts[stepIndex + 1]!
    const cancels: (() => void)[] = []
    for (let n = Math.ceil(from / beat - EPSILON); n * beat < to - EPSILON; n++) {
      const at = time + (n * beat - from) * wholeSeconds
      cancels.push(metronome.sink.click({ time: at, accent: n % beatsPerBar === 0 }))
    }
    return cancels
  }

  /** Schedules pass `pass` from step `from` at `time`, through the end of that pass. */
  function schedule(pass: number, from: number, time: number) {
    const timeline = buildTimeline(steps, wholeSeconds, { from, startAt: time })
    for (const span of timeline.spans) {
      const cancels = timeline.notes
        .filter((note) => note.stepIndex === span.stepIndex)
        .map((note) => sink.play({ midi: note.midi, time: note.time, duration: note.duration }))
      cancels.push(...scheduleClicks(span.stepIndex, span.start))
      scheduled.push({ ...span, pass, cancels })
    }
  }

  const last = () => scheduled[scheduled.length - 1]

  /** When the latest scheduled pass started (or starts). */
  function latestPassStart(): number {
    const pass = last()!.pass
    return scheduled.find((step) => step.pass === pass)!.start
  }

  function update(now: number) {
    if (stopped || !loop) return
    // The latest pass has started, so the one after it is due. After a long gap between updates
    // (a background tab pauses animation frames) it would start in the past and sound at once, so
    // the missed passes are skipped and the next one starts just ahead of now.
    if (now >= latestPassStart()) schedule(last()!.pass + 1, 0, Math.max(last()!.end, now + RESUME_LEAD_SECONDS))
  }

  function setWholeSeconds(next: number, now: number) {
    wholeSeconds = next
    if (stopped) return
    const kept = scheduled.filter((step) => step.start <= now)
    for (const step of scheduled.filter((s) => s.start > now)) step.cancels.forEach((cancel) => cancel())
    scheduled = kept

    const current = last()
    if (!current) {
      schedule(0, 0, startAt)
    } else if (current.end < now) {
      // The run went quiet while no update came (see update): a loop starts afresh, a single pass is over.
      if (loop) schedule(current.pass + 1, 0, now + RESUME_LEAD_SECONDS)
    } else if (current.stepIndex + 1 < steps.length) {
      schedule(current.pass, current.stepIndex + 1, current.end)
    } else if (loop) {
      schedule(current.pass + 1, 0, current.end)
    }
    update(now)
  }

  schedule(0, 0, startAt)

  return {
    update,
    setWholeSeconds,
    activePositionIds(at) {
      if (stopped) return []
      return scheduled.filter((step) => step.start <= at && at < step.end).flatMap((step) => step.positionIds)
    },
    finished(at) {
      return stopped || (!loop && at >= last()!.end)
    },
    stop() {
      stopped = true
      for (const step of scheduled) step.cancels.forEach((cancel) => cancel())
      scheduled = []
      sink.stopAll()
      metronome?.sink.stopAll()
    },
  }
}
