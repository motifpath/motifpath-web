import { computed, onBeforeUnmount, ref } from 'vue'

import type { TapCheckResult } from '@/features/student/composables/usePracticeSessionRun'
import { medianTapMs, TAP_CHECK_MS } from '@/features/student/utils/tapCheck'
import type { CellPlace } from '@/shared/utils/fretboardCell'

/** The frets a tap check lights: near the nut, where a phone shows them widest. */
export const TAP_CHECK_LAST_FRET = 4
/** A fret lights after a pause between these, so a tap can't be timed by rhythm. */
const MIN_PAUSE_MS = 400
const MAX_PAUSE_MS = 900

/**
 * Runs a tap check on a board of `stringCount` strings: once started, frets light one at a time,
 * at random and after a random pause, and each tap on the lit fret is timed from when it lit. A
 * tap anywhere else doesn't count. After its 20 seconds it reports the median tap time and how
 * many taps it was taken over, or null when there were none.
 */
export function useTapCheck(stringCount: () => number, done: (result: TapCheckResult | null) => void) {
  const running = ref(false)
  const lit = ref<CellPlace | null>(null)
  const elapsedMs = ref(0)
  const secondsLeft = computed(() => Math.max(0, Math.ceil((TAP_CHECK_MS - elapsedMs.value) / 1000)))

  const tapTimes: number[] = []
  let startedAt = 0
  let litAt = 0
  let pauseTimer: ReturnType<typeof setTimeout> | undefined
  let endTimer: ReturnType<typeof setTimeout> | undefined
  let clock: ReturnType<typeof setInterval> | undefined

  function randomBetween(min: number, max: number) {
    return min + Math.floor(Math.random() * (max - min + 1))
  }

  function lightNext(previous: CellPlace | null) {
    pauseTimer = setTimeout(() => {
      let next: CellPlace
      do {
        next = { string: randomBetween(1, stringCount()), fret: randomBetween(1, TAP_CHECK_LAST_FRET) }
      } while (previous && next.string === previous.string && next.fret === previous.fret)
      lit.value = next
      litAt = Date.now()
    }, randomBetween(MIN_PAUSE_MS, MAX_PAUSE_MS))
  }

  function stopTimers() {
    clearTimeout(pauseTimer)
    clearTimeout(endTimer)
    clearInterval(clock)
    running.value = false
    lit.value = null
  }

  function start() {
    if (running.value) return
    running.value = true
    startedAt = Date.now()
    tapTimes.length = 0
    clock = setInterval(() => {
      elapsedMs.value = Date.now() - startedAt
    }, 250)
    endTimer = setTimeout(() => {
      stopTimers()
      const median = medianTapMs(tapTimes)
      done(median === null ? null : { medianMs: median, count: tapTimes.length })
    }, TAP_CHECK_MS)
    lightNext(null)
  }

  function tap(place: CellPlace) {
    const target = lit.value
    if (!running.value || !target || place.string !== target.string || place.fret !== target.fret) return
    tapTimes.push(Date.now() - litAt)
    lit.value = null
    lightNext(target)
  }

  /** Stops without a result. */
  function stop() {
    stopTimers()
  }

  onBeforeUnmount(stopTimers)

  return { running, lit, secondsLeft, start, tap, stop }
}
