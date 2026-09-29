import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'
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

function mountPlayer(options: { attachTo?: HTMLElement } = {}) {
  return mount(DiagramPlayer, {
    props: {
      diagram: makeSequencedFrettedDiagram(),
      instrument: makeFrettedInstrument(),
      playback: { direction: 'as_authored', loop: false },
    },
    ...options,
  })
}

const button = (wrapper: ReturnType<typeof mountPlayer>) => wrapper.get('[data-test="diagram-play"]')
const tempoToggle = (wrapper: ReturnType<typeof mountPlayer>) => wrapper.get('[data-test="diagram-tempo-toggle"]')

async function openTempo(wrapper: ReturnType<typeof mountPlayer>) {
  await tempoToggle(wrapper).trigger('click')
  return wrapper.get('[data-test="diagram-tempo-panel"]')
}

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

  it('gives Play and the tempo control touch targets of at least 44 px', () => {
    const wrapper = mountPlayer()
    for (const control of [button(wrapper), tempoToggle(wrapper)]) {
      expect(control.classes()).toContain('h-11')
      expect(control.classes().some((name) => /^(w-11|w-\[\d+px\])$/.test(name))).toBe(true)
    }
  })

  it('while the sound loads, says so and can still be stopped', async () => {
    player.current!.state.value = 'loading'
    const wrapper = mountPlayer()
    expect(button(wrapper).attributes('aria-busy')).toBe('true')
    expect(button(wrapper).attributes('aria-label')).toBe('Stop')
    expect(wrapper.get('[data-test="diagram-player-status"]').text()).toBe('Loading the sound…')
  })

  it('while playing, offers Stop', () => {
    player.current!.state.value = 'playing'
    expect(button(mountPlayer()).attributes('aria-label')).toBe('Stop')
  })

  it("says when the sound couldn't load and offers Retry, without covering the diagram's controls", async () => {
    player.current!.state.value = 'error'
    const wrapper = mountPlayer()

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain("Couldn't load the sound")
    expect(alert.classes()).toContain('pointer-events-none')
    expect(button(wrapper).attributes('aria-label')).toBe('Retry')
    await button(wrapper).trigger('click')
    expect(player.current!.toggle).toHaveBeenCalled()
  })

  it('shows the tempo on its control, opening a panel only on demand', async () => {
    const wrapper = mountPlayer()

    expect(tempoToggle(wrapper).text()).toContain('90')
    expect(tempoToggle(wrapper).attributes('aria-label')).toBe('Tempo: 90 BPM')
    expect(tempoToggle(wrapper).attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="diagram-tempo-panel"]').exists()).toBe(false)

    await openTempo(wrapper)
    expect(tempoToggle(wrapper).attributes('aria-expanded')).toBe('true')
  })

  it('changes the tempo from a slider from 20 to 300 BPM', async () => {
    const wrapper = mountPlayer()
    const slider = (await openTempo(wrapper)).get<HTMLInputElement>('[data-test="diagram-tempo"]')

    expect(slider.attributes('min')).toBe('20')
    expect(slider.attributes('max')).toBe('300')
    expect(slider.element.value).toBe('90')
    await slider.setValue('120')
    expect(player.current!.tempo.value).toBe(120)
  })

  it('changes the tempo from a labelled numeric input', async () => {
    const wrapper = mountPlayer()
    const panel = await openTempo(wrapper)
    const input = panel.get<HTMLInputElement>('[data-test="diagram-tempo-number"]')

    expect(panel.get('label').attributes('for')).toBe(input.attributes('id'))
    await input.setValue('120')
    expect(player.current!.tempo.value).toBe(120)
  })

  it.each(['19', '301', '90.5', ''])('ignores the typed tempo "%s" and shows the current one again on leaving', async (entry) => {
    const wrapper = mountPlayer()
    const input = (await openTempo(wrapper)).get<HTMLInputElement>('[data-test="diagram-tempo-number"]')

    await input.setValue(entry)
    await input.trigger('blur')

    expect(player.current!.tempo.value).toBe(90)
    expect(input.element.value).toBe('90')
  })

  it('closes the tempo panel on Escape and from its close control, returning focus to the tempo control', async () => {
    const wrapper = mountPlayer({ attachTo: document.body })

    await (await openTempo(wrapper)).trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-test="diagram-tempo-panel"]').exists()).toBe(false)
    expect(document.activeElement).toBe(tempoToggle(wrapper).element)

    await (await openTempo(wrapper)).get('[data-test="diagram-tempo-close"]').trigger('click')
    expect(wrapper.find('[data-test="diagram-tempo-panel"]').exists()).toBe(false)
    expect(document.activeElement).toBe(tempoToggle(wrapper).element)
    wrapper.unmount()
  })

  it('closes the tempo panel on a press outside the player, without taking focus', async () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    const wrapper = mountPlayer({ attachTo: document.body })
    await openTempo(wrapper)
    outside.focus()

    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()

    expect(wrapper.find('[data-test="diagram-tempo-panel"]').exists()).toBe(false)
    expect(document.activeElement).toBe(outside)
    wrapper.unmount()
    outside.remove()
  })

  it('keeps each player’s tempo input its own when two share a page', async () => {
    const props = { diagram: makeSequencedFrettedDiagram(), instrument: makeFrettedInstrument(), playback: { direction: 'as_authored' as const, loop: false } }
    const page = mount(defineComponent({ render: () => h('div', [h(DiagramPlayer, props), h(DiagramPlayer, props)]) }))

    const [first, second] = page.findAll('[data-test="diagram-tempo-toggle"]')
    await second!.trigger('click')
    expect(page.findAll('[data-test="diagram-tempo-panel"]')).toHaveLength(1)
    await first!.trigger('click')

    const panels = page.findAll('[data-test="diagram-tempo-panel"]')
    const ids = panels.map((panel) => panel.get('input[type="number"]').attributes('id'))
    expect(ids[0]).not.toBe(ids[1])
    panels.forEach((panel, index) => expect(panel.get('label').attributes('for')).toBe(ids[index]))
  })

  it('keeps a press on its controls from reaching whatever holds the diagram', async () => {
    const onCardClick = vi.fn()
    const holder = document.createElement('div')
    holder.addEventListener('click', onCardClick)
    document.body.append(holder)
    const wrapper = mountPlayer({ attachTo: holder })

    await button(wrapper).trigger('click')
    const panel = await openTempo(wrapper)
    await panel.get('[data-test="diagram-tempo"]').trigger('click')

    expect(onCardClick).not.toHaveBeenCalled()
    wrapper.unmount()
    holder.remove()
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
