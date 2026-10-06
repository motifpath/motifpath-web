import { afterEach, describe, expect, it, vi } from 'vitest'

import { webWakeLock } from '@/shared/platform/wakeLock'

function fakeSentinel() {
  return { release: vi.fn().mockResolvedValue(undefined) }
}

describe('webWakeLock', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock')
  })

  it('asks the browser to keep the screen on, and lets it go on release', async () => {
    const sentinel = fakeSentinel()
    const request = vi.fn().mockResolvedValue(sentinel)
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })

    const lock = webWakeLock()
    await lock.acquire()
    await lock.release()

    expect(request).toHaveBeenCalledWith('screen')
    expect(sentinel.release).toHaveBeenCalledOnce()
  })

  it('does nothing where the browser can’t keep the screen on', async () => {
    const lock = webWakeLock()

    await expect(lock.acquire()).resolves.toBeUndefined()
    await expect(lock.release()).resolves.toBeUndefined()
  })

  it('carries on when the browser refuses, as it does on low battery', async () => {
    Object.defineProperty(navigator, 'wakeLock', { value: { request: vi.fn().mockRejectedValue(new Error('NotAllowedError')) }, configurable: true })

    await expect(webWakeLock().acquire()).resolves.toBeUndefined()
  })
})
