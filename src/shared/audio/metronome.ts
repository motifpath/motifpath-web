/**
 * A metronome that runs on its own, apart from any playback: a bar of beats at a tempo, the
 * downbeat loudest. With a note value it clicks that many times a beat, the beat's click louder
 * than those between beats; in halves it clicks every other beat, counted from each bar's start.
 * A compound bar (6/8, 12/8) accents each group of three beats. Beats are scheduled a little
 * ahead on the audio clock, so a busy main thread doesn't make them drift; a change of settings
 * applies from the next beat not yet scheduled, without stopping.
 */
import type { components } from '@/api/generated/core-domain'
import type { ClickLevel, ClickSink } from './playbackRun'
import { speedFactor } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'
import { isCompound } from '@/shared/utils/sequence'

type TimeSignature = components['schemas']['TimeSignature']

/** How often the scheduler wakes up, in milliseconds. */
const WAKE_MS = 25
/** How far ahead of the audio clock beats are scheduled, in seconds. */
const AHEAD_SECONDS = 0.1
/** The gap left before the first beat, so it is never scheduled in the past. */
const START_DELAY_SECONDS = 0.05
/** How long a scheduled beat is remembered, for saying which beat is sounding. */
const BEAT_MEMORY_SECONDS = 4

export interface MetronomeSettings {
  bpm: number
  /** Beats in a bar, each `beatValue` long (4 in 4/4, 6 in 6/8). */
  beats: number
  beatValue: TimeSignature['beat_value']
  noteValue: TempoNoteValue
}

export interface Metronome {
  start(settings: MetronomeSettings): void
  /** Applies new settings from the next beat; nothing happens while stopped. */
  update(settings: MetronomeSettings): void
  stop(): void
  running(): boolean
  /** Which beat of the bar, from 0, is sounding at `time` on the audio clock; null when none is. */
  beatAt(time: number): number | null
}

/** How loud the start of beat `beat` of a bar is: the downbeat, a group's first beat in a compound bar, or any beat. */
function beatLevel(beat: number, settings: MetronomeSettings): ClickLevel {
  if (beat === 0) return 'downbeat'
  if (!isCompound({ beats: settings.beats, beat_value: settings.beatValue })) return 'beat'
  return beat % 3 === 0 ? 'beat' : 'between'
}

export function createMetronome({ now, sink }: { now: () => number; sink: ClickSink }): Metronome {
  let timer: ReturnType<typeof setInterval> | null = null
  let settings: MetronomeSettings | null = null
  let nextBeatAt = 0
  let beatInBar = 0
  let scheduledBeats: { time: number; beat: number }[] = []

  /** Clicks beat `beat` of the bar, starting at `time` and lasting `seconds`. */
  function clickBeat(time: number, seconds: number, beat: number, current: MetronomeSettings) {
    const factor = speedFactor(current.noteValue)
    if (factor < 1) {
      // Slower than the beat: one click every 1/factor beats, from the bar's start.
      if (beat % Math.round(1 / factor) === 0) sink.click({ time, level: beatLevel(beat, current) })
      return
    }
    for (let k = 0; k < factor; k++) {
      sink.click({ time: time + (k * seconds) / factor, level: k === 0 ? beatLevel(beat, current) : 'between' })
    }
  }

  function schedule() {
    const current = settings
    if (!current) return
    while (nextBeatAt < now() + AHEAD_SECONDS) {
      const seconds = 60 / current.bpm
      // A bar made shorter while it plays starts again from its downbeat.
      if (beatInBar >= current.beats) beatInBar = 0
      clickBeat(nextBeatAt, seconds, beatInBar, current)
      scheduledBeats.push({ time: nextBeatAt, beat: beatInBar })
      nextBeatAt += seconds
      beatInBar = (beatInBar + 1) % current.beats
    }
    scheduledBeats = scheduledBeats.filter((entry) => entry.time > now() - BEAT_MEMORY_SECONDS)
  }

  function start(next: MetronomeSettings) {
    stop()
    settings = { ...next, beats: Math.max(1, next.beats) }
    nextBeatAt = now() + START_DELAY_SECONDS
    beatInBar = 0
    schedule()
    timer = setInterval(schedule, WAKE_MS)
  }

  function update(next: MetronomeSettings) {
    if (timer === null) return
    settings = { ...next, beats: Math.max(1, next.beats) }
  }

  function stop() {
    if (timer !== null) clearInterval(timer)
    timer = null
    scheduledBeats = []
    sink.stopAll()
  }

  function beatAt(time: number): number | null {
    const sounding = scheduledBeats.filter((entry) => entry.time <= time).at(-1)
    return sounding ? sounding.beat : null
  }

  return { start, update, stop, running: () => timer !== null, beatAt }
}
