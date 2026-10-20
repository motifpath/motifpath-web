import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ChoiceChip from '@/shared/components/ChoiceChip.vue'

describe('ChoiceChip', () => {
  it('is a toggle button with its label', () => {
    const wrapper = mount(ChoiceChip, { props: { label: "The video won't play", selected: false } })

    const button = wrapper.get('button')
    expect(button.text()).toBe("The video won't play")
    expect(button.attributes('aria-pressed')).toBe('false')
  })

  it('shows a check mark when selected, so selection never relies on colour alone', () => {
    const wrapper = mount(ChoiceChip, { props: { label: 'Something else', selected: true } })

    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-test="choice-chip-check"]').exists()).toBe(true)
  })

  it('has no check mark while not selected', () => {
    const wrapper = mount(ChoiceChip, { props: { label: 'Something else', selected: false } })

    expect(wrapper.find('[data-test="choice-chip-check"]').exists()).toBe(false)
  })

  it('draws a 40 px chip inside a 48 px touch target', () => {
    const wrapper = mount(ChoiceChip, { props: { label: 'Something else', selected: false } })

    expect(wrapper.get('button').classes()).toContain('min-h-12')
    expect(wrapper.get('[data-test="choice-chip-face"]').classes()).toContain('h-10')
  })

  it('asks to toggle when tapped', async () => {
    const wrapper = mount(ChoiceChip, { props: { label: 'Something else', selected: false } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })
})
