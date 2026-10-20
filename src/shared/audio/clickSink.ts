/**
 * A metronome's click, synthesized rather than sampled: a short blip whose
 * level falls away fast, higher on a downbeat and softer between beats. Nothing
 * to load, so it can sound from the first beat of a count-in.
 */
import type { ClickLevel, ClickSink } from './playbackRun'

const DOWNBEAT_HZ = 1760
const BEAT_HZ = 1320
const CLICK_SECONDS = 0.035
/** How loud each kind of click starts. */
const LEVELS: Record<ClickLevel, number> = { downbeat: 0.35, beat: 0.21, between: 0.1 }
/** The quietest a click's level ramps to; an exponential ramp can't reach zero. */
const SILENT = 0.0001

export function createClickSink(context: AudioContext): ClickSink {
  const live = new Set<() => void>()

  function click({ time, level }: { time: number; level: ClickLevel }) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = level === 'downbeat' ? DOWNBEAT_HZ : BEAT_HZ
    gain.gain.setValueAtTime(LEVELS[level], time)
    gain.gain.exponentialRampToValueAtTime(SILENT, time + CLICK_SECONDS)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + CLICK_SECONDS)

    const cancel = () => {
      live.delete(cancel)
      oscillator.disconnect()
      gain.disconnect()
    }
    live.add(cancel)
    oscillator.addEventListener('ended', cancel)
    return cancel
  }

  function stopAll() {
    for (const cancel of [...live]) cancel()
  }

  return { click, stopAll }
}
