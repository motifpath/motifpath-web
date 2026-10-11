/**
 * A metronome that runs on its own, apart from any playback: a click on every beat at a tempo,
 * the first of each bar accented. Beats are scheduled a little ahead on the audio clock, so a busy
 * main thread doesn't make them drift; a tempo change spaces the beats after the next one.
 */
import type { ClickSink } from './playbackRun'

/** How often the scheduler wakes up, in milliseconds. */
const WAKE_MS = 25
/** How far ahead of the audio clock beats are scheduled, in seconds. */
const AHEAD_SECONDS = 0.1
/** The gap left before the first beat, so it is never scheduled in the past. */
const START_DELAY_SECONDS = 0.05

export interface Metronome {
  start(tempo: { bpm: number; beatsPerBar: number }): void
  setTempo(bpm: number): void
  stop(): void
  running(): boolean
}

export function createMetronome({ now, sink }: { now: () => number; sink: ClickSink }): Metronome {
  let timer: ReturnType<typeof setInterval> | null = null
  let secondsPerBeat = 1
  let beatsPerBar = 4
  let nextBeatAt = 0
  let beat = 0

  function schedule() {
    while (nextBeatAt < now() + AHEAD_SECONDS) {
      sink.click({ time: nextBeatAt, accent: beat % beatsPerBar === 0 })
      nextBeatAt += secondsPerBeat
      beat += 1
    }
  }

  function start(tempo: { bpm: number; beatsPerBar: number }) {
    stop()
    secondsPerBeat = 60 / tempo.bpm
    beatsPerBar = Math.max(1, tempo.beatsPerBar)
    nextBeatAt = now() + START_DELAY_SECONDS
    beat = 0
    schedule()
    timer = setInterval(schedule, WAKE_MS)
  }

  function setTempo(bpm: number) {
    secondsPerBeat = 60 / bpm
  }

  function stop() {
    if (timer !== null) clearInterval(timer)
    timer = null
    sink.stopAll()
  }

  return { start, setTempo, stop, running: () => timer !== null }
}
