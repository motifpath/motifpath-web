import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OverviewStrip from '@/shared/components/diagram/OverviewStrip.vue'

const BOARD = 1200
const VIEW = 300

function mountStrip(scrollLeft = 0) {
  const wrapper = mount(OverviewStrip, {
    props: { contentWidth: BOARD, viewWidth: VIEW, scrollLeft, label: 'A minor pentatonic' },
    slots: { default: '<svg data-test="miniature" />' },
    attachTo: document.body,
  })
  // The strip is drawn 400 px wide, from x = 100: a third of the board's own size.
  wrapper.get('[data-test="overview-strip"]').element.getBoundingClientRect = () =>
    ({ left: 100, width: 400, right: 500, top: 0, bottom: 40, height: 40, x: 100, y: 0, toJSON: () => ({}) }) as DOMRect
  return wrapper
}

describe('OverviewStrip', () => {
  it('shows the whole board in miniature, with a window over the part in view', () => {
    const wrapper = mountStrip(600)

    expect(wrapper.find('[data-test="miniature"]').exists()).toBe(true)
    const window = wrapper.get('[data-test="overview-window"]')
    expect(window.attributes('style')).toContain('left: 50%')
    expect(window.attributes('style')).toContain('width: 25%')
  })

  it('moves its window as the board scrolls', async () => {
    const wrapper = mountStrip(0)

    await wrapper.setProps({ scrollLeft: 900 })

    expect(wrapper.get('[data-test="overview-window"]').attributes('style')).toContain('left: 75%')
  })

  it('scrolls the board to a tapped place, centred on it', async () => {
    const wrapper = mountStrip(0)

    // x = 300 is halfway along the strip, the board's 600 px.
    await wrapper.get('[data-test="overview-strip"]').trigger('pointerdown', { clientX: 300, pointerId: 1 })

    expect(wrapper.emitted('scrollTo')).toEqual([[450]])
  })

  it('scrolls the board along as the window is dragged, never past either end', async () => {
    const wrapper = mountStrip(0)
    const strip = wrapper.get('[data-test="overview-strip"]')

    await strip.trigger('pointerdown', { clientX: 150, pointerId: 1 })
    await strip.trigger('pointermove', { clientX: 480, pointerId: 1 })
    await strip.trigger('pointerup', { clientX: 480, pointerId: 1 })
    await strip.trigger('pointermove', { clientX: 300, pointerId: 1 })

    expect(wrapper.emitted('scrollTo')).toEqual([[0], [BOARD - VIEW]])
  })

  it('works as a scrollbar from the keyboard, half a view per arrow', async () => {
    const wrapper = mountStrip(300)
    const window = wrapper.get('[data-test="overview-window"]')

    expect(window.attributes()).toMatchObject({ role: 'scrollbar', 'aria-orientation': 'horizontal', 'aria-valuenow': '33' })
    expect(window.attributes('aria-label')).toBe('A minor pentatonic: part in view')
    await window.trigger('keydown', { key: 'ArrowRight' })
    await window.trigger('keydown', { key: 'ArrowLeft' })
    await window.trigger('keydown', { key: 'End' })
    await window.trigger('keydown', { key: 'Home' })

    expect(wrapper.emitted('scrollTo')).toEqual([[450], [150], [BOARD - VIEW], [0]])
  })
})
