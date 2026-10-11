import { onUnmounted, ref, watch } from 'vue'

import { unlockAudioContext } from '@/shared/audio/audioContext'
import { createClickSink } from '@/shared/audio/clickSink'
import { createMetronome } from '@/shared/audio/metronome'
import type { Metronome } from '@/shared/audio/metronome'

/**
 * A metronome a student turns on and off, clicking at `bpm` with the first of every
 * `beatsPerBar` beats accented, and following a tempo change while it clicks. Turn it on from a
 * tap, which is when the browser lets audio start. It stops when its screen goes.
 */
export function useMetronome(bpm: () => number, beatsPerBar: () => number) {
  const on = ref(false)
  let metronome: Metronome | null = null

  function start() {
    if (!metronome) {
      const audio = unlockAudioContext()
      metronome = createMetronome({ now: () => audio.currentTime, sink: createClickSink(audio) })
    }
    metronome.start({ bpm: bpm(), beatsPerBar: beatsPerBar() })
    on.value = true
  }

  function stop() {
    metronome?.stop()
    on.value = false
  }

  function toggle() {
    if (on.value) stop()
    else start()
  }

  watch(bpm, (next) => {
    if (on.value) metronome?.setTempo(next)
  })
  onUnmounted(() => {
    if (on.value) stop()
  })

  return { on, toggle }
}
