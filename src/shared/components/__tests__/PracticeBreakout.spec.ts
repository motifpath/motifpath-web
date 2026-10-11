import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PracticeBreakout from '@/shared/components/PracticeBreakout.vue'

/** Makes the screen at least `width` wide, as far as the size-class queries ask. */
function screenWidth(width: number) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? Infinity)
    return { matches: width >= min, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  })
}

function mountBreakout() {
  return mount(PracticeBreakout, { slots: { default: '<svg data-test="board" />' } })
}

describe('PracticeBreakout', () => {
  afterEach(() => Reflect.deleteProperty(window, 'matchMedia'))

  it('keeps a diagram in the text column on a phone', () => {
    screenWidth(390)
    const wrapper = mountBreakout()

    expect(wrapper.find('[data-test="board"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="breakout"]').attributes('data-size-class')).toBe('compact')
    expect(wrapper.get('[data-test="breakout"]').classes()).not.toContain('-translate-x-1/2')
  })

  it('lets a diagram leave the column on a tablet, up to 720 px', () => {
    screenWidth(700)
    const breakout = mountBreakout().get('[data-test="breakout"]')

    expect(breakout.attributes('data-size-class')).toBe('medium')
    expect(breakout.classes()).toEqual(expect.arrayContaining(['-translate-x-1/2', 'max-w-[45rem]']))
  })

  it('lets a diagram leave the column on a laptop, up to 960 px', () => {
    screenWidth(1280)
    const breakout = mountBreakout().get('[data-test="breakout"]')

    expect(breakout.attributes('data-size-class')).toBe('expanded')
    expect(breakout.classes()).toEqual(expect.arrayContaining(['-translate-x-1/2', 'max-w-[60rem]']))
  })
})
