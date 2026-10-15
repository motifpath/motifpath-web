import { onScopeDispose, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

export type CountdownState = 'ready' | 'running' | 'finished'

/** How often the time left is read while running: often enough for a seconds display. */
const TICK_MS = 100

/**
 * A countdown for a timed drill, such as a minute of chord changes. It waits, ready, until
 * started; it reads the time left from the clock, so a slow tick never stretches the minute; and
 * it says it finished once, at zero. Starting again starts over from the whole time. It stops
 * when its owner goes away.
 */
export function useCountdown(totalMs: MaybeRefOrGetter<number>, onFinished: () => void = () => {}) {
  const state = ref<CountdownState>('ready')
  const remainingMs = ref(toValue(totalMs))

  let endsAt = 0
  let timer: ReturnType<typeof setInterval> | null = null

  function stopTicking() {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  function tick() {
    remainingMs.value = Math.max(0, endsAt - Date.now())
    if (remainingMs.value > 0) return
    stopTicking()
    state.value = 'finished'
    onFinished()
  }

  function start() {
    stopTicking()
    endsAt = Date.now() + toValue(totalMs)
    remainingMs.value = toValue(totalMs)
    state.value = 'running'
    timer = setInterval(tick, TICK_MS)
  }

  function reset() {
    stopTicking()
    remainingMs.value = toValue(totalMs)
    state.value = 'ready'
  }

  onScopeDispose(stopTicking)

  return { state, remainingMs, start, reset }
}
