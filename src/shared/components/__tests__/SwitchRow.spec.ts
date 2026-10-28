import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SwitchRow from '@/shared/components/SwitchRow.vue'

const props = { label: 'Reminders', description: 'An evening nudge on days you have not played yet.' }

describe('SwitchRow', () => {
  it('is one switch, named by its label and described by its text', () => {
    const wrapper = mount(SwitchRow, { props: { ...props, modelValue: true }, attachTo: document.body })

    const row = wrapper.get('[role="switch"]')
    expect(row.attributes('aria-checked')).toBe('true')
    const labelId = row.attributes('aria-labelledby')
    const descriptionId = row.attributes('aria-describedby')
    expect(document.getElementById(labelId ?? '')?.textContent).toBe('Reminders')
    expect(document.getElementById(descriptionId ?? '')?.textContent).toBe(props.description)
    wrapper.unmount()
  })

  it('reads as off when off', () => {
    const wrapper = mount(SwitchRow, { props: { ...props, modelValue: false } })

    expect(wrapper.get('[role="switch"]').attributes('aria-checked')).toBe('false')
  })

  it.each([
    [true, false],
    [false, true],
  ])('a tap anywhere on the row asks to flip it from %s to %s', async (from, to) => {
    const wrapper = mount(SwitchRow, { props: { ...props, modelValue: from } })

    await wrapper.get('[role="switch"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[to]])
  })
})
