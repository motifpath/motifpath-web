/**
 * A metronome's click, synthesized rather than sampled: a short blip whose
 * level falls away fast, higher on an accent. Nothing to load, so it can sound
 * from the first beat of a count-in.
 */
import type { ClickSink } from './playbackRun'

const ACCENT_HZ = 1760
const BEAT_HZ = 1320
const CLICK_SECONDS = 0.035
const LEVEL = 0.35
/** The quietest a click's level ramps to; an exponential ramp can't reach zero. */
const SILENT = 0.0001

export function createClickSink(context: AudioContext): ClickSink {
  const live = new Set<() => void>()

  function click({ time, accent }: { time: number; accent: boolean }) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = accent ? ACCENT_HZ : BEAT_HZ
    gain.gain.setValueAtTime(accent ? LEVEL : LEVEL * 0.6, time)
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
