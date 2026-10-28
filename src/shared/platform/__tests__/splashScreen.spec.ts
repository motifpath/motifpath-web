import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { holdSplashUntilReady, type NativeSplash } from '@/shared/platform/splashScreen'

function fakeSplash() {
  return { hide: vi.fn<NativeSplash['hide']>().mockResolvedValue(undefined) }
}

describe('holdSplashUntilReady', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps the splash up while the first screen can’t render yet', async () => {
    const splash = fakeSplash()

    holdSplashUntilReady(ref(false), splash)
    await vi.advanceTimersByTimeAsync(5_000)

    expect(splash.hide).not.toHaveBeenCalled()
  })

  it('hides the splash as soon as the first screen can render', async () => {
    const splash = fakeSplash()
    const ready = ref(false)
    holdSplashUntilReady(ready, splash)

    ready.value = true
    await nextTick()

    expect(splash.hide).toHaveBeenCalledOnce()
  })

  it('hides it at once when the screen is already ready', () => {
    const splash = fakeSplash()

    holdSplashUntilReady(ref(true), splash)

    expect(splash.hide).toHaveBeenCalledOnce()
  })

  it('gives way to the screen’s own loading state after 10 seconds', async () => {
    const splash = fakeSplash()

    holdSplashUntilReady(ref(false), splash)
    await vi.advanceTimersByTimeAsync(10_000)

    expect(splash.hide).toHaveBeenCalledOnce()
  })

  it('hides it only once, whichever comes first', async () => {
    const splash = fakeSplash()
    const ready = ref(false)
    holdSplashUntilReady(ready, splash)

    await vi.advanceTimersByTimeAsync(10_000)
    ready.value = true
    await nextTick()

    expect(splash.hide).toHaveBeenCalledOnce()
  })

  it('carries on when the device refuses', async () => {
    const splash = { hide: vi.fn<NativeSplash['hide']>().mockRejectedValue(new Error('no splash')) }

    expect(() => holdSplashUntilReady(ref(true), splash)).not.toThrow()
    await vi.runAllTimersAsync()
  })
})
