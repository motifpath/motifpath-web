import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StepRow from '@/shared/components/StepRow.vue'

describe('StepRow', () => {
  it('renders the position and default slot content', () => {
    const wrapper = mount(StepRow, {
      props: { position: 3 },
      slots: { default: 'Minor pentatonic shape 1' },
    })

    expect(wrapper.get('[data-test="step-position"]').text()).toBe('3')
    expect(wrapper.text()).toContain('Minor pentatonic shape 1')
  })

  it('applies emphasis styling when emphasis is true', () => {
    const wrapper = mount(StepRow, { props: { position: 1, emphasis: true } })

    expect(wrapper.classes()).toContain('font-medium')
    expect(wrapper.classes()).toContain('text-ink')
  })

  it('applies muted styling when muted is true', () => {
    const wrapper = mount(StepRow, { props: { position: 1, muted: true } })

    expect(wrapper.classes()).toContain('text-ink-subtle')
  })

  it('renders the status slot only when provided', () => {
    const withStatus = mount(StepRow, {
      props: { position: 1 },
      slots: { status: '<span data-test="probe">done</span>' },
    })
    expect(withStatus.find('[data-test="probe"]').exists()).toBe(true)

    const withoutStatus = mount(StepRow, { props: { position: 1 } })
    expect(withoutStatus.find('[data-test="probe"]').exists()).toBe(false)
  })

  it('renders the action slot when provided', () => {
    const wrapper = mount(StepRow, {
      props: { position: 1 },
      slots: { action: '<a data-test="probe-action">Open</a>' },
    })

    expect(wrapper.find('[data-test="probe-action"]').exists()).toBe(true)
  })

  it('forwards arbitrary attributes to the root element', () => {
    const wrapper = mount(StepRow, {
      props: { position: 1 },
      attrs: { 'data-test': 'path-step', 'aria-disabled': 'true' },
    })

    expect(wrapper.attributes('data-test')).toBe('path-step')
    expect(wrapper.attributes('aria-disabled')).toBe('true')
  })
})
