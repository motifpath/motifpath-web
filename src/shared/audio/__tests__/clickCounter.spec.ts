import { describe, expect, it, vi } from 'vitest'

import { createClickCounter } from '@/shared/audio/clickCounter'
import type { ClickSink } from '@/shared/audio/playbackRun'

function fakeSink() {
  const cancels: ReturnType<typeof vi.fn>[] = []
  const sink: ClickSink = {
    click: vi.fn(() => {
      const cancel = vi.fn()
      cancels.push(cancel)
      return cancel
    }),
    stopAll: vi.fn(),
  }
  return { sink, cancels }
}

describe('createClickCounter', () => {
  it('passes every click on to the sink it wraps', () => {
    const { sink } = fakeSink()
    const counter = createClickCounter(sink)

    counter.sink.click({ time: 1, level: 'downbeat' })
    counter.sink.stopAll()

    expect(sink.click).toHaveBeenCalledWith({ time: 1, level: 'downbeat' })
    expect(sink.stopAll).toHaveBeenCalled()
  })

  it('says which beat of the bar the latest click by a time is on, counting from each downbeat', () => {
    const counter = createClickCounter(fakeSink().sink)
    ;(['downbeat', 'beat', 'beat', 'downbeat', 'beat'] as const).forEach((level, time) => counter.sink.click({ time, level }))

    expect(counter.beatAt(-0.5)).toBeNull()
    expect(counter.beatAt(0.2)).toBe(0)
    expect(counter.beatAt(2.9)).toBe(2)
    expect(counter.beatAt(3)).toBe(0)
    expect(counter.beatAt(10)).toBe(1)
  })

  it('forgets a click once it is cancelled, and every click once cleared', () => {
    const { sink, cancels } = fakeSink()
    const counter = createClickCounter(sink)
    counter.sink.click({ time: 0, level: 'downbeat' })
    const cancelSecond = counter.sink.click({ time: 1, level: 'beat' })

    cancelSecond()
    expect(cancels[1]).toHaveBeenCalled()
    expect(counter.beatAt(1.5)).toBe(0)

    counter.clear()
    expect(counter.beatAt(1.5)).toBeNull()
  })
})
