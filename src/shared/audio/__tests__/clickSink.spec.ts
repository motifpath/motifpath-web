import { describe, expect, it, vi } from 'vitest'

import { createClickSink } from '../clickSink'

/** An AudioContext that records the oscillators it makes. */
function fakeContext() {
  const oscillators: { frequency: number; startedAt: number | null; stoppedAt: number | null; disconnected: boolean }[] = []
  /** The level each click starts at, in the order they were made. */
  const levels: number[] = []
  const param = () => ({
    value: 0,
    setValueAtTime: (value: number) => levels.push(value),
    exponentialRampToValueAtTime: vi.fn(),
  })
  const context = {
    currentTime: 3,
    destination: {},
    createOscillator() {
      const record = { frequency: 0, startedAt: null as number | null, stoppedAt: null as number | null, disconnected: false }
      oscillators.push(record)
      return {
        frequency: {
          set value(hz: number) {
            record.frequency = hz
          },
        },
        connect: (node: unknown) => node,
        start: (at: number) => (record.startedAt = at),
        stop: (at: number) => (record.stoppedAt = at),
        disconnect: () => (record.disconnected = true),
        addEventListener: vi.fn(),
      }
    },
    createGain() {
      return { gain: param(), connect: (node: unknown) => node, disconnect: vi.fn() }
    },
  }
  return { context: context as unknown as AudioContext, oscillators, levels }
}

describe('createClickSink', () => {
  it('clicks briefly at the time asked', () => {
    const { context, oscillators } = fakeContext()
    createClickSink(context).click({ time: 5, level: 'beat' })

    expect(oscillators).toHaveLength(1)
    expect(oscillators[0]!.startedAt).toBe(5)
    expect(oscillators[0]!.stoppedAt).toBeGreaterThan(5)
    expect(oscillators[0]!.stoppedAt).toBeLessThan(5.1)
  })

  it('clicks higher on a downbeat', () => {
    const { context, oscillators } = fakeContext()
    const sink = createClickSink(context)
    sink.click({ time: 5, level: 'downbeat' })
    sink.click({ time: 6, level: 'beat' })

    expect(oscillators[0]!.frequency).toBeGreaterThan(oscillators[1]!.frequency)
  })

  it('clicks softer between beats than on a beat', () => {
    const { context, levels } = fakeContext()
    const sink = createClickSink(context)
    sink.click({ time: 5, level: 'beat' })
    sink.click({ time: 5.5, level: 'between' })

    expect(levels[0]!).toBeGreaterThan(levels[1]!)
  })

  it('cancels a click', () => {
    const { context, oscillators } = fakeContext()
    createClickSink(context).click({ time: 5, level: 'beat' })()

    expect(oscillators[0]!.disconnected).toBe(true)
  })

  it('silences every click at once', () => {
    const { context, oscillators } = fakeContext()
    const sink = createClickSink(context)
    sink.click({ time: 5, level: 'beat' })
    sink.click({ time: 6, level: 'beat' })
    sink.stopAll()

    expect(oscillators.every((o) => o.disconnected)).toBe(true)
  })
})
