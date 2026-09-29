import { mount } from '@vue/test-utils'
import { nextTick, ref, shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlaybackState } from '@/shared/composables/useDiagramPlayback'
import { makeFrettedInstrument, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'

const player = vi.hoisted(() => ({
  current: null as null | {
    canPlay: { value: boolean }
    state: { value: PlaybackState }
    activePositionIds: { value: string[] }
    tempo: { value: number }
    toggle: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    prefetch: ReturnType<typeof vi.fn>
  },
}))

vi.mock('@/shared/composables/useDiagramPlayback', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useDiagramPlayback: () => player.current,
}))

import DiagramPlayer from '@/shared/components/diagram/DiagramPlayer.vue'

let observe: ((entries: { isIntersecting: boolean }[]) => void) | null = null

beforeEach(() => {
  player.current = {
    canPlay: ref(true),
    state: ref<PlaybackState>('idle'),
    activePositionIds: shallowRef<string[]>([]),
    tempo: ref(90),
    toggle: vi.fn(),
    stop: vi.fn(),
    prefetch: vi.fn(),
  }
  observe = null
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        observe = callback
      }
      observe() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mountPlayer() {
  return mount(DiagramPlayer, {
    props: {
      diagram: makeSequencedFrettedDiagram(),
      instrument: makeFrettedInstrument(),
      playback: { direction: 'as_authored', loop: false },
    },
  })
}

const button = (wrapper: ReturnType<typeof mountPlayer>) => wrapper.get('[data-test="diagram-play"]')

describe('DiagramPlayer', () => {
  it('shows nothing when the diagram has nothing to play', () => {
    player.current!.canPlay.value = false
    expect(mountPlayer().find('[data-test="diagram-player"]').exists()).toBe(false)
  })

  it('Play starts the diagram', async () => {
    const wrapper = mountPlayer()
    expect(button(wrapper).attributes('aria-label')).toBe('Play')
    await button(wrapper).trigger('click')
    expect(player.current!.toggle).toHaveBeenCalled()
  })

  it('while the sound loads, says so and can still be stopped', async () => {
    player.current!.state.value = 'loading'
    const wrapper = mountPlayer()
    expect(button(wrapper).attributes('aria-busy')).toBe('true')
    expect(button(wrapper).attributes('aria-label')).toBe('Stop')
  })

  it('while playing, offers Stop', () => {
    player.current!.state.value = 'playing'
    expect(button(mountPlayer()).attributes('aria-label')).toBe('Stop')
  })

  it("says when the sound couldn't load", () => {
    player.current!.state.value = 'error'
    const wrapper = mountPlayer()
    expect(wrapper.get('[role="alert"]').text()).toContain("Couldn't load the sound")
    expect(button(wrapper).attributes('aria-label')).toBe('Play')
  })

  it('a tempo slider shows and changes the tempo, from 20 to 300 BPM', async () => {
    const wrapper = mountPlayer()
    const slider = wrapper.get<HTMLInputElement>('[data-test="diagram-tempo"]')
    expect(slider.attributes('min')).toBe('20')
    expect(slider.attributes('max')).toBe('300')
    expect(slider.element.value).toBe('90')
    expect(wrapper.text()).toContain('90 BPM')

    await slider.setValue('120')
    expect(player.current!.tempo.value).toBe(120)
  })

  it('reports the positions being heard, for the diagram to light up', async () => {
    const wrapper = mountPlayer()
    player.current!.activePositionIds.value = ['p0']
    await nextTick()
    expect(wrapper.emitted('active')).toEqual([[['p0']]])
  })

  it('fetches the sound ahead once it scrolls into view', () => {
    mountPlayer()
    observe!([{ isIntersecting: false }])
    expect(player.current!.prefetch).not.toHaveBeenCalled()
    observe!([{ isIntersecting: true }])
    expect(player.current!.prefetch).toHaveBeenCalledTimes(1)
  })
})
