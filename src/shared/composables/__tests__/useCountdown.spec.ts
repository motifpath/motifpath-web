import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useCountdown } from '@/shared/composables/useCountdown'

function startScope(totalMs: number, onFinished = vi.fn()) {
  const scope = effectScope()
  const countdown = scope.run(() => useCountdown(() => totalMs, onFinished))!
  return { scope, countdown, onFinished }
}

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('is ready with the whole time left until started', () => {
    const { countdown } = startScope(60_000)

    vi.advanceTimersByTime(5_000)
    expect(countdown.state.value).toBe('ready')
    expect(countdown.remainingMs.value).toBe(60_000)
  })

  it('counts down from the moment it starts', () => {
    const { countdown } = startScope(60_000)

    countdown.start()
    vi.advanceTimersByTime(18_000)
    expect(countdown.state.value).toBe('running')
    expect(countdown.remainingMs.value).toBeGreaterThan(41_000)
    expect(countdown.remainingMs.value).toBeLessThanOrEqual(42_000)
  })

  it('finishes once, at zero, and says so', () => {
    const { countdown, onFinished } = startScope(10_000)

    countdown.start()
    vi.advanceTimersByTime(12_000)
    expect(countdown.state.value).toBe('finished')
    expect(countdown.remainingMs.value).toBe(0)
    expect(onFinished).toHaveBeenCalledTimes(1)
  })

  it('starts over from the whole time on a restart, without finishing the first run', () => {
    const { countdown, onFinished } = startScope(10_000)

    countdown.start()
    vi.advanceTimersByTime(6_000)
    countdown.start()
    vi.advanceTimersByTime(6_000)
    expect(countdown.state.value).toBe('running')
    expect(onFinished).not.toHaveBeenCalled()
  })

  it('goes back to ready on reset', () => {
    const { countdown } = startScope(10_000)

    countdown.start()
    vi.advanceTimersByTime(3_000)
    countdown.reset()
    expect(countdown.state.value).toBe('ready')
    expect(countdown.remainingMs.value).toBe(10_000)
  })

  it('stops counting when its owner goes away', () => {
    const { scope, countdown, onFinished } = startScope(10_000)

    countdown.start()
    scope.stop()
    vi.advanceTimersByTime(20_000)
    expect(onFinished).not.toHaveBeenCalled()
  })
})
