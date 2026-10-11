import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'

const engine = { start: vi.fn(), setTempo: vi.fn(), stop: vi.fn(), running: vi.fn(() => false) }
vi.mock('@/shared/audio/metronome', () => ({ createMetronome: () => engine }))
vi.mock('@/shared/audio/audioContext', () => ({ unlockAudioContext: () => ({ currentTime: 0 }) }))
vi.mock('@/shared/audio/clickSink', () => ({ createClickSink: () => ({ click: vi.fn(), stopAll: vi.fn() }) }))

import { useMetronome } from '@/shared/composables/useMetronome'

const bpm = ref(72)
const beatsPerBar = ref(3)

function mountWith() {
  let api!: ReturnType<typeof useMetronome>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useMetronome(() => bpm.value, () => beatsPerBar.value)
        return () => null
      },
    }),
  )
  return { wrapper, api }
}

beforeEach(() => {
  bpm.value = 72
  Object.values(engine).forEach((fn) => fn.mockClear())
})
afterEach(() => vi.clearAllMocks())

describe('useMetronome', () => {
  it('is off until turned on, then clicks at the tempo and meter', () => {
    const { api } = mountWith()
    expect(api.on.value).toBe(false)

    api.toggle()

    expect(api.on.value).toBe(true)
    expect(engine.start).toHaveBeenCalledWith({ bpm: 72, beatsPerBar: 3 })
  })

  it('follows a tempo change while it clicks', async () => {
    const { api } = mountWith()
    api.toggle()

    bpm.value = 56
    await nextTick()

    expect(engine.setTempo).toHaveBeenCalledWith(56)
  })

  it('stops when turned off, and when the screen goes', () => {
    const { api, wrapper } = mountWith()
    api.toggle()
    api.toggle()
    expect(engine.stop).toHaveBeenCalledTimes(1)
    expect(api.on.value).toBe(false)

    api.toggle()
    wrapper.unmount()
    expect(engine.stop).toHaveBeenCalledTimes(2)
  })
})
