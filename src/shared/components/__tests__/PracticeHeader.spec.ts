import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PracticeHeader from '@/shared/components/PracticeHeader.vue'

function mountHeader(props: Record<string, unknown> = {}) {
  return mount(PracticeHeader, { props: { exitLabel: 'End session', ...props } })
}

describe('PracticeHeader', () => {
  it('names what × does', () => {
    const wrapper = mountHeader()

    expect(wrapper.get('[data-test="shell-exit"]').attributes('aria-label')).toBe('End session')
  })

  it('exits when × is pressed', async () => {
    const wrapper = mountHeader()

    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('shows where the student is in the run, one segment per item filled as far as it went', () => {
    const wrapper = mountHeader({ position: { current: 2, total: 3 }, progress: [1, 0.5, 0] })

    expect(wrapper.get('[data-test="shell-position"]').text()).toBe('2 / 3')
    const segments = wrapper.findAll('[data-test="session-segment"]')
    expect(segments.map((segment) => segment.attributes('data-filled'))).toEqual(['100', '50', '0'])
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('2')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuemax')).toBe('3')
  })

  it('shows only × outside a run', () => {
    const wrapper = mountHeader()

    expect(wrapper.find('[data-test="shell-position"]').exists()).toBe(false)
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('gives × a 48 px touch target', () => {
    const wrapper = mountHeader()

    expect(wrapper.get('[data-test="shell-exit"]').classes()).toEqual(expect.arrayContaining(['h-12', 'w-12']))
  })
})
