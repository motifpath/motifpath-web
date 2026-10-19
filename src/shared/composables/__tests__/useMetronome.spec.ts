import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'

import type { MetronomeSettings } from '@/shared/audio/metronome'

const engine = {
  start: vi.fn(),
  update: vi.fn(),
  stop: vi.fn(),
  running: vi.fn(() => false),
  beatAt: vi.fn((): number | null => null),
}
vi.mock('@/shared/audio/metronome', () => ({ createMetronome: () => engine }))
vi.mock('@/shared/audio/audioContext', () => ({
  unlockAudioContext: () => ({ currentTime: 0 }),
  audibleTime: () => 0,
}))
vi.mock('@/shared/audio/clickSink', () => ({ createClickSink: () => ({ click: vi.fn(), stopAll: vi.fn() }) }))

import { useMetronome } from '@/shared/composables/useMetronome'

const settings = ref<MetronomeSettings>({ bpm: 72, beats: 3, beatValue: 4, noteValue: 'quarters' })

function mountWith() {
  let api!: ReturnType<typeof useMetronome>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useMetronome(() => settings.value)
        return () => null
      },
    }),
  )
  return { wrapper, api }
}

beforeEach(() => {
  vi.useFakeTimers()
  settings.value = { bpm: 72, beats: 3, beatValue: 4, noteValue: 'quarters' }
  Object.values(engine).forEach((fn) => fn.mockClear())
  engine.beatAt.mockReturnValue(null)
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('useMetronome', () => {
  it('is off until turned on, then clicks at its settings', () => {
    const { api } = mountWith()
    expect(api.on.value).toBe(false)

    api.toggle()

    expect(api.on.value).toBe(true)
    expect(engine.start).toHaveBeenCalledWith({ bpm: 72, beats: 3, beatValue: 4, noteValue: 'quarters' })
  })

  it('starts on demand, from the first beat of a bar even when it was already clicking', () => {
    const { api } = mountWith()
    api.toggle()

    api.start()

    expect(api.on.value).toBe(true)
    expect(engine.start).toHaveBeenCalledTimes(2)
  })

  it('follows a change of tempo, bar or note value while it clicks', async () => {
    const { api } = mountWith()
    api.toggle()

    settings.value = { bpm: 56, beats: 7, beatValue: 8, noteValue: 'eighths' }
    await nextTick()

    expect(engine.update).toHaveBeenLastCalledWith({ bpm: 56, beats: 7, beatValue: 8, noteValue: 'eighths' })
  })

  it('says which beat of the bar is sounding while it clicks', async () => {
    const { api } = mountWith()
    expect(api.beat.value).toBeNull()

    api.toggle()
    engine.beatAt.mockReturnValue(2)
    await vi.advanceTimersByTimeAsync(50)

    expect(api.beat.value).toBe(2)
  })

  it('stops when turned off, and when the screen goes', () => {
    const { api, wrapper } = mountWith()
    api.toggle()
    api.toggle()
    expect(engine.stop).toHaveBeenCalledTimes(1)
    expect(api.on.value).toBe(false)
    expect(api.beat.value).toBeNull()

    api.toggle()
    wrapper.unmount()
    expect(engine.stop).toHaveBeenCalledTimes(2)
  })
})
