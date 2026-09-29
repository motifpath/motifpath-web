/**
 * The page's one AudioContext, and the clock that says what is audible now.
 * Kept apart from the sampler so a Play click can create and resume the
 * context synchronously — iOS Safari only unlocks audio inside the gesture —
 * before the sampler's code has even loaded.
 */

let context: AudioContext | null = null

/** The page's AudioContext, created on first use and resumed. Call it inside a user gesture. */
export function unlockAudioContext(): AudioContext {
  context ??= new AudioContext({ latencyHint: 'interactive' })
  if (context.state !== 'running') void context.resume()
  return context
}

/** Forgets the page's context. For tests. */
export function resetAudioContextForTests() {
  context = null
}

/**
 * The context time leaving the speakers at `perfNow` (a `performance.now()`
 * reading), output latency included: the output timestamp carried forward to
 * now, or where a browser doesn't report one, the current time less the
 * latencies it reports.
 */
export function audibleTime(
  audio: Pick<AudioContext, 'currentTime' | 'baseLatency' | 'outputLatency' | 'getOutputTimestamp'>,
  perfNow: number = performance.now(),
): number {
  const { contextTime, performanceTime } = audio.getOutputTimestamp()
  if (!contextTime || !performanceTime) return audio.currentTime - (audio.outputLatency || 0) - audio.baseLatency
  return contextTime + (perfNow - performanceTime) / 1000
}
