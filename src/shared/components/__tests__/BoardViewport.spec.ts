import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import BoardViewport from '@/shared/components/diagram/BoardViewport.vue'

function mountViewport(contentWidth: number, viewWidth = 300) {
  return mount(BoardViewport, {
    props: { contentWidth, viewWidth, label: 'A minor pentatonic' },
    slots: { default: '<svg data-test="board" />', overview: '<svg data-test="miniature" />' },
  })
}

async function scrollBoardTo(wrapper: ReturnType<typeof mountViewport>, left: number) {
  const scroller = wrapper.get('[data-test="board-scroll"]')
  scroller.element.scrollLeft = left
  await scroller.trigger('scroll')
}

describe('BoardViewport', () => {
  it('shows a board that fits as it is, with no overview strip and no fades', () => {
    const wrapper = mountViewport(280)

    expect(wrapper.get('[data-test="board-scroll"]').find('[data-test="board"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overview-strip"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="board-scroll"]').attributes('data-fade')).toBeUndefined()
  })

  it('scrolls a board too wide to fit at its own size, with the overview strip under it', () => {
    const wrapper = mountViewport(1200)

    expect(wrapper.get('[data-test="board-scroll"]').classes()).toContain('overflow-x-auto')
    expect(wrapper.get('[data-test="overview-strip"]').find('[data-test="miniature"]').exists()).toBe(true)
  })

  it('can be scrolled from the keyboard when too wide, named by its diagram', () => {
    expect(mountViewport(1200).get('[data-test="board-scroll"]').attributes()).toMatchObject({
      tabindex: '0',
      role: 'region',
      'aria-label': 'A minor pentatonic',
    })
    expect(mountViewport(280).get('[data-test="board-scroll"]').attributes('tabindex')).toBeUndefined()
  })

  it('fades the edge that has more board beyond it', async () => {
    const wrapper = mountViewport(1200)
    const fade = () => wrapper.get('[data-test="board-scroll"]').attributes('data-fade')
    expect(fade()).toBe('end')

    await scrollBoardTo(wrapper, 400)
    expect(fade()).toBe('both')

    await scrollBoardTo(wrapper, 900)
    expect(fade()).toBe('start')
  })

  it('moves the strip’s window as the board scrolls, and says how far it went', async () => {
    const wrapper = mountViewport(1200)

    await scrollBoardTo(wrapper, 600)

    expect(wrapper.get('[data-test="overview-window"]').attributes('style')).toContain('left: 50%')
    expect(wrapper.emitted('scroll')).toEqual([[600]])
  })

  it('scrolls the board where the strip is tapped or dragged', async () => {
    const wrapper = mountViewport(1200)
    const scrollTo = vi.fn()
    wrapper.get('[data-test="board-scroll"]').element.scrollTo = scrollTo

    await wrapper.get('[data-test="overview-window"]').trigger('keydown', { key: 'End' })

    expect(scrollTo).toHaveBeenCalledWith({ left: 900, behavior: 'auto' })
    expect(wrapper.get('[data-test="overview-window"]').attributes('style')).toContain('left: 75%')
  })

  it('scrolls the board for its parent, as when following the sounding note', async () => {
    const wrapper = mountViewport(1200)
    const scrollTo = vi.fn()
    wrapper.get('[data-test="board-scroll"]').element.scrollTo = scrollTo

    wrapper.vm.scrollTo(300, 'smooth')
    await wrapper.vm.$nextTick()

    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' })
    expect(wrapper.get('[data-test="overview-window"]').attributes('style')).toContain('left: 25%')
  })
})
