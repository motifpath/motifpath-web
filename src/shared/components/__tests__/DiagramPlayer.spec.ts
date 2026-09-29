import { DOMWrapper, enableAutoUnmount, mount } from '@vue/test-utils'
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
// The tempo panel and the error message are drawn at the end of the page, so every player is
// unmounted after its test to take them away with it.
enableAutoUnmount(afterEach)

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

/** The tempo panel, wherever it's drawn on the page; null while closed. */
function tempoPanel(): DOMWrapper<HTMLElement> | null {
  const panel = document.querySelector<HTMLElement>('[data-test="diagram-tempo-panel"]')
  return panel ? new DOMWrapper(panel) : null
}

async function openTempo(wrapper: ReturnType<typeof mountPlayer>) {
  await tempoToggle(wrapper).trigger('click')
  return tempoPanel()!
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

  it('gives Play and the tempo control the same 44 px square touch target', () => {
    const wrapper = mountPlayer()
    for (const control of [button(wrapper), tempoToggle(wrapper)]) {
      expect(control.classes()).toEqual(expect.arrayContaining(['h-11', 'w-11']))
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

    const alert = new DOMWrapper(document.querySelector<HTMLElement>('[role="alert"]')!)
    expect(alert.text()).toContain("Couldn't load the sound")
    expect(alert.classes()).toContain('pointer-events-none')
    expect(button(wrapper).attributes('aria-label')).toBe('Retry')
    await button(wrapper).trigger('click')
    expect(player.current!.toggle).toHaveBeenCalled()
  })

  it('shows a metronome on the tempo control, naming the tempo, and opens a panel only on demand', async () => {
    const wrapper = mountPlayer()

    expect(tempoToggle(wrapper).text()).toBe('')
    expect(tempoToggle(wrapper).find('svg.lucide-metronome-icon').exists()).toBe(true)
    expect(tempoToggle(wrapper).attributes('aria-label')).toBe('Tempo: 90 BPM')
    expect(tempoToggle(wrapper).attributes('title')).toBe('Tempo: 90 BPM')
    expect(tempoToggle(wrapper).attributes('aria-expanded')).toBe('false')
    expect(tempoPanel()).toBeNull()

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
    expect(tempoPanel()).toBeNull()
    expect(document.activeElement).toBe(tempoToggle(wrapper).element)

    await (await openTempo(wrapper)).get('[data-test="diagram-tempo-close"]').trigger('click')
    expect(tempoPanel()).toBeNull()
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

    expect(tempoPanel()).toBeNull()
    expect(document.activeElement).toBe(outside)
    wrapper.unmount()
    outside.remove()
  })

  it('keeps each player’s tempo input its own when two share a page', async () => {
    const props = { diagram: makeSequencedFrettedDiagram(), instrument: makeFrettedInstrument(), playback: { direction: 'as_authored' as const, loop: false } }
    const page = mount(defineComponent({ render: () => h('div', [h(DiagramPlayer, props), h(DiagramPlayer, props)]) }))

    const [first, second] = page.findAll('[data-test="diagram-tempo-toggle"]')
    await second!.trigger('click')
    const allPanels = () => [...document.querySelectorAll<HTMLElement>('[data-test="diagram-tempo-panel"]')].map((panel) => new DOMWrapper(panel))
    expect(allPanels()).toHaveLength(1)
    await first!.trigger('click')

    const panels = allPanels()
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

  it('opens the tempo panel over the page, so a card that clips its content never cuts it off', async () => {
    const card = document.createElement('div')
    card.style.overflow = 'hidden'
    document.body.append(card)
    const wrapper = mountPlayer({ attachTo: card })
    vi.spyOn(tempoToggle(wrapper).element, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 120, y: 60, width: 44, height: 44 }),
    )

    const panel = await openTempo(wrapper)

    expect(card.contains(panel.element)).toBe(false)
    expect(panel.classes()).toContain('fixed')
    expect(panel.element.style.left).toBe('120px')
    expect(panel.element.style.top).toBe('108px')
    card.remove()
  })

  it('shows the load error over the page too, under Play', async () => {
    player.current!.state.value = 'error'
    const card = document.createElement('div')
    card.style.overflow = 'hidden'
    document.body.append(card)
    mountPlayer({ attachTo: card })
    await nextTick()

    const alert = document.querySelector<HTMLElement>('[role="alert"]')!
    expect(card.contains(alert)).toBe(false)
    expect(alert.classList).toContain('fixed')
    card.remove()
  })

  it('keeps the tempo panel open while its own controls are pressed', async () => {
    const wrapper = mountPlayer({ attachTo: document.body })
    const panel = await openTempo(wrapper)

    panel.get('[data-test="diagram-tempo"]').element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()

    expect(tempoPanel()).not.toBeNull()
  })

  describe('from the keyboard', () => {
    it('moves focus onto the tempo slider when the panel opens, so the next keys adjust the tempo', async () => {
      const wrapper = mountPlayer({ attachTo: document.body })

      const panel = await openTempo(wrapper)
      await nextTick()

      expect(document.activeElement).toBe(panel.get('[data-test="diagram-tempo"]').element)
    })

    it('closes the tempo panel when focus moves elsewhere on the page', async () => {
      const outside = document.createElement('button')
      document.body.append(outside)
      const wrapper = mountPlayer({ attachTo: document.body })
      await openTempo(wrapper)
      await nextTick()

      outside.focus()
      await nextTick()

      expect(tempoPanel()).toBeNull()
      expect(document.activeElement).toBe(outside)
      outside.remove()
    })

    it('keeps the tempo panel open while focus moves between its own controls', async () => {
      const wrapper = mountPlayer({ attachTo: document.body })
      const panel = await openTempo(wrapper)
      await nextTick()

      panel.get<HTMLInputElement>('[data-test="diagram-tempo-number"]').element.focus()
      await nextTick()

      expect(tempoPanel()).not.toBeNull()
    })
  })

  describe('while its control is out of sight', () => {
    // What sits on top at a point of the screen: the control itself, or whatever covers it.
    let topmost: () => Element | null
    beforeEach(() => {
      topmost = () => null
      document.elementFromPoint = () => topmost()
    })
    afterEach(() => {
      Reflect.deleteProperty(document, 'elementFromPoint')
    })
    const shown = (element: Element | null) => element !== null && (element as HTMLElement).style.display !== 'none'

    it('hides the load error while Play is covered, such as by the app bar or a menu, and shows it again once Play is back', async () => {
      player.current!.state.value = 'error'
      const cover = document.createElement('header')
      topmost = () => cover
      const wrapper = mountPlayer({ attachTo: document.body })
      await nextTick()
      await nextTick()
      const alert = () => document.querySelector('[role="alert"]')

      expect(shown(alert())).toBe(false)

      topmost = () => button(wrapper).element
      window.dispatchEvent(new Event('scroll'))
      await nextTick()
      expect(shown(alert())).toBe(true)
    })

    it('hides the open tempo panel while its control is covered, checking again after a click such as opening a menu', async () => {
      const wrapper = mountPlayer({ attachTo: document.body })
      topmost = () => tempoToggle(wrapper).element
      await openTempo(wrapper)
      await nextTick()
      expect(shown(tempoPanel()!.element)).toBe(true)

      topmost = () => document.createElement('nav')
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await nextTick()

      expect(tempoPanel() === null || !shown(tempoPanel()!.element)).toBe(true)
    })
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
