import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useVisibleTime } from '@/shared/composables/useVisibleTime'

let visibility: DocumentVisibilityState = 'visible'

function setVisibility(next: DocumentVisibilityState) {
  visibility = next
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers()
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function inScope<T>(make: () => T) {
  const scope = effectScope()
  const value = scope.run(make)!
  return { value, stop: () => scope.stop() }
}

describe('useVisibleTime', () => {
  it('counts the time since it started, while the page is visible', () => {
    const { value: visible } = inScope(() => useVisibleTime())
    visible.start()

    vi.advanceTimersByTime(95_000)

    expect(visible.lap()).toBe(95_000)
  })

  it('leaves out the time the page was hidden', () => {
    const { value: visible } = inScope(() => useVisibleTime())
    visible.start()

    vi.advanceTimersByTime(60_000)
    setVisibility('hidden')
    vi.advanceTimersByTime(30 * 60_000)
    setVisibility('visible')
    vi.advanceTimersByTime(60_000)

    expect(visible.lap()).toBe(120_000)
  })

  it('counts each lap from the one before', () => {
    const { value: visible } = inScope(() => useVisibleTime())
    visible.start()

    vi.advanceTimersByTime(40_000)
    expect(visible.lap()).toBe(40_000)
    vi.advanceTimersByTime(15_000)
    expect(visible.lap()).toBe(15_000)
  })

  it('counts nothing for a lap taken while hidden since the last one', () => {
    const { value: visible } = inScope(() => useVisibleTime())
    visible.start()

    setVisibility('hidden')
    vi.advanceTimersByTime(10_000)

    expect(visible.lap()).toBe(0)
  })

  it('starts hidden when the page is hidden at the start', () => {
    visibility = 'hidden'
    const { value: visible } = inScope(() => useVisibleTime())
    visible.start()

    vi.advanceTimersByTime(10_000)
    setVisibility('visible')
    vi.advanceTimersByTime(5_000)

    expect(visible.lap()).toBe(5_000)
  })

  it('stops listening once its scope ends', () => {
    const { value: visible, stop } = inScope(() => useVisibleTime())
    visible.start()
    const remove = vi.spyOn(document, 'removeEventListener')

    stop()

    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })
})
