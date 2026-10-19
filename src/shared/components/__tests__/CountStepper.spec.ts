import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CountStepper from '@/shared/components/CountStepper.vue'

/** Mounts the stepper bound to a count, as a parent's v-model would hold it. */
function mountWithModel(modelValue = 18, max?: number) {
  const wrapper = mount(CountStepper, {
    props: {
      modelValue,
      label: 'clean changes',
      ...(max === undefined ? {} : { max }),
      'onUpdate:modelValue': (value: number) => wrapper.setProps({ modelValue: value }),
    },
  })
  return wrapper
}

describe('CountStepper', () => {
  it('shows the count with what it counts, as a spin button', () => {
    const wrapper = mountWithModel(18)

    const count = wrapper.get('[role="spinbutton"]')
    expect(count.text()).toBe('18')
    expect(count.attributes()).toMatchObject({ 'aria-valuenow': '18', 'aria-valuemin': '0', 'aria-valuetext': '18 clean changes' })
    expect(wrapper.get('[data-test="count-label"]').text()).toBe('clean changes')
  })

  it('counts one more and one fewer with its buttons', async () => {
    const wrapper = mountWithModel(18)

    await wrapper.get('[data-test="count-more"]').trigger('click')
    expect(wrapper.get('[role="spinbutton"]').text()).toBe('19')

    await wrapper.get('[data-test="count-fewer"]').trigger('click')
    await wrapper.get('[data-test="count-fewer"]').trigger('click')
    expect(wrapper.get('[role="spinbutton"]').text()).toBe('17')
  })

  it('steps with the arrow keys', async () => {
    const wrapper = mountWithModel(5)

    const count = wrapper.get('[role="spinbutton"]')
    await count.trigger('keydown', { key: 'ArrowUp' })
    await count.trigger('keydown', { key: 'ArrowUp' })
    await count.trigger('keydown', { key: 'ArrowDown' })
    expect(count.text()).toBe('6')
  })

  it('never counts below zero', async () => {
    const wrapper = mountWithModel(0)

    await wrapper.get('[data-test="count-fewer"]').trigger('click')
    await wrapper.get('[role="spinbutton"]').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.get('[role="spinbutton"]').text()).toBe('0')
    expect(wrapper.get('[data-test="count-fewer"]').attributes('disabled')).toBeDefined()
  })

  it('names its buttons by what they count', () => {
    const wrapper = mountWithModel(3)

    expect(wrapper.get('[data-test="count-more"]').attributes('aria-label')).toBe('One more: clean changes')
    expect(wrapper.get('[data-test="count-fewer"]').attributes('aria-label')).toBe('One fewer: clean changes')
  })

  it('never counts past its most, by button or by key', async () => {
    const wrapper = mountWithModel(39, 40)

    await wrapper.get('[data-test="count-more"]').trigger('click')
    expect(wrapper.get('[role="spinbutton"]').text()).toBe('40')
    expect(wrapper.get('[role="spinbutton"]').attributes('aria-valuemax')).toBe('40')
    expect(wrapper.get('[data-test="count-more"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[role="spinbutton"]').trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.get('[role="spinbutton"]').text()).toBe('40')
  })

  it('has no most unless given one', () => {
    const wrapper = mountWithModel(18)

    expect(wrapper.get('[role="spinbutton"]').attributes('aria-valuemax')).toBeUndefined()
    expect(wrapper.get('[data-test="count-more"]').attributes('disabled')).toBeUndefined()
  })
})
