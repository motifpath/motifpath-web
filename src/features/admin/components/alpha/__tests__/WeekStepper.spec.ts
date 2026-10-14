import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import WeekStepper from '@/features/admin/components/alpha/WeekStepper.vue'

describe('WeekStepper', () => {
  it('shows the week it is on', () => {
    const wrapper = mount(WeekStepper, { props: { label: 'This week · 12–18 Oct', canGoNext: false } })

    expect(wrapper.get('[data-test="week-label"]').text()).toBe('This week · 12–18 Oct')
  })

  it('steps back and forward', async () => {
    const wrapper = mount(WeekStepper, { props: { label: '5–11 Oct', canGoNext: true } })

    await wrapper.get('[aria-label="Previous week"]').trigger('click')
    await wrapper.get('[aria-label="Next week"]').trigger('click')

    expect(wrapper.emitted('previous')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('cannot step past the running week', () => {
    const wrapper = mount(WeekStepper, { props: { label: 'This week · 12–18 Oct', canGoNext: false } })

    expect(wrapper.get('[aria-label="Next week"]').attributes('disabled')).toBeDefined()
  })
})
