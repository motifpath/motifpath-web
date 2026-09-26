import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LevelPicker from '@/shared/components/LevelPicker.vue'

describe('LevelPicker', () => {
  it('offers the five levels, in order, by their translated names', () => {
    const wrapper = mount(LevelPicker, { props: { modelValue: null } })

    const options = wrapper.findAll('[role="radio"]')
    expect(options.map((o) => o.text())).toEqual([
      'Beginner',
      'Early intermediate',
      'Intermediate',
      'Advanced',
      'Expert',
    ])
  })

  it('marks no level as chosen when there is none', () => {
    const wrapper = mount(LevelPicker, { props: { modelValue: null } })

    expect(wrapper.findAll('[aria-checked="true"]')).toHaveLength(0)
  })

  it('marks the chosen level', () => {
    const wrapper = mount(LevelPicker, { props: { modelValue: 'advanced' } })

    expect(wrapper.get('[data-test="level-option-advanced"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[data-test="level-option-beginner"]').attributes('aria-checked')).toBe('false')
  })

  it('emits the level picked', async () => {
    const wrapper = mount(LevelPicker, { props: { modelValue: 'beginner' } })

    await wrapper.get('[data-test="level-option-intermediate"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['intermediate']])
  })

  it('cannot be changed while disabled', async () => {
    const wrapper = mount(LevelPicker, { props: { modelValue: 'beginner', disabled: true } })

    const option = wrapper.get('[data-test="level-option-expert"]')
    expect(option.attributes('disabled')).toBeDefined()
    await option.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
