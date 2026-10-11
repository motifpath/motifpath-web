import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import FloatingChordCard from '@/shared/components/songChart/FloatingChordCard.vue'

function mountFloat(corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right') {
  return mount(FloatingChordCard, {
    props: { corner },
    slots: { default: '<button data-test="inside">G</button><div data-test="body">card</div>' },
    attachTo: document.body,
  })
}

/** Fires a pointer event; jsdom has no PointerEvent, so a MouseEvent carries the coordinates. */
function pointer(target: EventTarget, type: string, x: number, y: number) {
  target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }))
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FloatingChordCard', () => {
  it('sits in the corner it is given', () => {
    const wrapper = mountFloat('top-left')

    expect(wrapper.get('[data-test="floating-chord-card"]').attributes('data-corner')).toBe('top-left')
  })

  it('moves to the corner nearest where it is dropped', async () => {
    const wrapper = mountFloat('bottom-right')
    const float = wrapper.get('[data-test="floating-chord-card"]').element

    pointer(float, 'pointerdown', 900, 700)
    pointer(window, 'pointermove', 400, 300)
    pointer(window, 'pointermove', 100, 80)
    pointer(window, 'pointerup', 100, 80)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:corner')).toEqual([['top-left']])
  })

  it('treats a press that barely moves as a tap, not a drag', async () => {
    const wrapper = mountFloat('bottom-right')
    const float = wrapper.get('[data-test="floating-chord-card"]').element

    pointer(float, 'pointerdown', 900, 700)
    pointer(window, 'pointerup', 903, 698)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:corner')).toBeUndefined()
  })

  it('leaves the buttons inside to their taps', async () => {
    const wrapper = mountFloat('bottom-right')

    pointer(wrapper.get('[data-test="inside"]').element, 'pointerdown', 900, 700)
    pointer(window, 'pointermove', 100, 80)
    pointer(window, 'pointerup', 100, 80)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:corner')).toBeUndefined()
  })
})
