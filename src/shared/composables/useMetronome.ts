import { onUnmounted, ref, watch } from 'vue'

import { audibleTime, unlockAudioContext } from '@/shared/audio/audioContext'
import { createClickSink } from '@/shared/audio/clickSink'
import { createMetronome } from '@/shared/audio/metronome'
import type { Metronome, MetronomeSettings } from '@/shared/audio/metronome'

/**
 * A metronome a student turns on and off, clicking at its settings (tempo, bar and note value)
 * and following a change of any of them while it clicks. Starting it again begins a new bar. It says which beat of the bar is
 * sounding, as heard, so a bar of dots can follow it. Turn it on from a tap, which is when the
 * browser lets audio start. It stops when its screen goes.
 */
export function useMetronome(settings: () => MetronomeSettings) {
  const on = ref(false)
  /** The beat of the bar sounding now, from 0; null while silent. */
  const beat = ref<number | null>(null)
  let metronome: Metronome | null = null
  let audio: AudioContext | null = null
  let frame = 0

  function follow() {
    if (!metronome || !audio) return
    const heard = metronome.beatAt(audibleTime(audio))
    if (heard !== beat.value) beat.value = heard
    frame = requestAnimationFrame(follow)
  }

  function start() {
    cancelAnimationFrame(frame)
    if (!metronome) {
      audio = unlockAudioContext()
      const context = audio
      metronome = createMetronome({ now: () => context.currentTime, sink: createClickSink(context) })
    }
    metronome.start(settings())
    on.value = true
    frame = requestAnimationFrame(follow)
  }

  function stop() {
    cancelAnimationFrame(frame)
    metronome?.stop()
    on.value = false
    beat.value = null
  }

  function toggle() {
    if (on.value) stop()
    else start()
  }

  watch(settings, (next) => {
    if (on.value) metronome?.update(next)
  })
  onUnmounted(() => {
    if (on.value) stop()
  })

  return { on, beat, start, toggle, stop }
}
