import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProgressMeter from '@/shared/components/ProgressMeter.vue'

describe('ProgressMeter', () => {
  it('renders a labelled progressbar with the completed/total caption', () => {
    const wrapper = mount(ProgressMeter, { props: { completed: 1, total: 3 } })

    expect(wrapper.text()).toBe('1 of 3 steps complete')

    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('1')
    expect(bar.attributes('aria-valuemin')).toBe('0')
    expect(bar.attributes('aria-valuemax')).toBe('3')
  })

  it('reflects full completion', () => {
    const wrapper = mount(ProgressMeter, { props: { completed: 2, total: 2 } })

    expect(wrapper.text()).toBe('2 of 2 steps complete')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('2')
  })

  it('handles a zero-length path without dividing by zero', () => {
    const wrapper = mount(ProgressMeter, { props: { completed: 0, total: 0 } })

    expect(wrapper.text()).toBe('0 of 0 steps complete')
  })
})
