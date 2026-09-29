import { afterEach, describe, expect, it, vi } from 'vitest'

import { audibleTime, resetAudioContextForTests, unlockAudioContext } from '../audioContext'

class FakeAudioContext {
  static created = 0
  state: AudioContextState = 'suspended'
  resume = vi.fn(async () => {
    this.state = 'running'
  })
  constructor() {
    FakeAudioContext.created++
  }
}

afterEach(() => {
  resetAudioContextForTests()
  vi.unstubAllGlobals()
  FakeAudioContext.created = 0
})

describe('unlockAudioContext', () => {
  it('creates one context for the whole page and resumes it', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const first = unlockAudioContext()
    const second = unlockAudioContext()
    expect(first).toBe(second)
    expect(FakeAudioContext.created).toBe(1)
    expect(vi.mocked(first.resume)).toHaveBeenCalled()
  })

  it("doesn't resume a context that is already running", () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const context = unlockAudioContext()
    Object.assign(context, { state: 'running' })
    vi.mocked(context.resume).mockClear()
    unlockAudioContext()
    expect(vi.mocked(context.resume)).not.toHaveBeenCalled()
  })
})

function clock(values: {
  currentTime: number
  baseLatency?: number
  outputLatency?: number
  timestamp?: AudioTimestamp
}): Pick<AudioContext, 'currentTime' | 'baseLatency' | 'outputLatency' | 'getOutputTimestamp'> {
  return {
    currentTime: values.currentTime,
    baseLatency: values.baseLatency ?? 0,
    outputLatency: values.outputLatency ?? 0,
    getOutputTimestamp: () => values.timestamp ?? {},
  }
}

describe('audibleTime', () => {
  it('is the context time leaving the speakers now, carried forward from the output timestamp', () => {
    const context = clock({ currentTime: 10.2, timestamp: { contextTime: 10, performanceTime: 5000 } })
    expect(audibleTime(context, 5050)).toBeCloseTo(10.05)
  })

  it('falls back to the current time less the latencies when there is no output timestamp', () => {
    const context = clock({ currentTime: 10.2, baseLatency: 0.01, outputLatency: 0.04 })
    expect(audibleTime(context, 5050)).toBeCloseTo(10.15)
  })
})
