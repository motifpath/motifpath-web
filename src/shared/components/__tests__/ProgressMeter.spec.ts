import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProgressMeter from '@/shared/components/ProgressMeter.vue'

describe('ProgressMeter', () => {
  it('shows a short count beside the bar and gives the bar the full sentence', () => {
    const wrapper = mount(ProgressMeter, { props: { completed: 1, total: 3 } })

    expect(wrapper.text()).toBe('1 of 3')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('1 of 3 steps complete')

    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('1')
    expect(bar.attributes('aria-valuemin')).toBe('0')
    expect(bar.attributes('aria-valuemax')).toBe('3')
  })

  it('reflects full completion', () => {
    const wrapper = mount(ProgressMeter, { props: { completed: 2, total: 2 } })

    expect(wrapper.text()).toBe('2 of 2')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('2')
  })

  it('handles a zero-length path without dividing by zero', () => {
    const wrapper = mount(ProgressMeter, { props: { completed: 0, total: 0 } })

    expect(wrapper.text()).toBe('0 of 0')
  })

  it('takes the unit-specific count and sentence when given', () => {
    const wrapper = mount(ProgressMeter, {
      props: { completed: 1, total: 4, label: '1 of 4 parts', summary: '1 of 4 parts done' },
    })

    expect(wrapper.text()).toBe('1 of 4 parts')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('1 of 4 parts done')
  })

  it('fills in the accent tone unless told it is a success', () => {
    const accent = mount(ProgressMeter, { props: { completed: 1, total: 2 } })
    const success = mount(ProgressMeter, { props: { completed: 2, total: 2, tone: 'success' } })

    expect(accent.get('[data-test="progress-fill"]').classes()).toContain('bg-accent')
    expect(success.get('[data-test="progress-fill"]').classes()).toContain('bg-success')
  })
})
