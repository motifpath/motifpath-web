import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OptionTile from '@/shared/components/OptionTile.vue'

describe('OptionTile', () => {
  it('shows its key and its label', () => {
    const wrapper = mount(OptionTile, { props: { keyHint: 3, label: 'G' } })

    expect(wrapper.get('[data-test="key-hint"]').text()).toBe('3')
    expect(wrapper.get('[data-test="option-label"]').text()).toBe('G')
  })

  it('says whether it is chosen', () => {
    expect(mount(OptionTile, { props: { keyHint: 1, label: 'C', state: 'selected' } }).attributes('aria-pressed')).toBe('true')
    expect(mount(OptionTile, { props: { keyHint: 1, label: 'C' } }).attributes('aria-pressed')).toBe('false')
  })

  it('is tapped like a button', async () => {
    const wrapper = mount(OptionTile, { props: { keyHint: 1, label: 'C' } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it.each([
    ['right', 'Right answer'],
    ['wrong', 'Your answer, wrong'],
  ] as const)('marks a %s option with an icon and words, not colour alone', (state, words) => {
    const wrapper = mount(OptionTile, { props: { keyHint: 1, label: 'C', state } })

    expect(wrapper.get('[data-test="answer-mark"]').text()).toBe(words)
    expect(wrapper.find('[data-test="answer-mark"] svg').exists()).toBe(true)
  })

  it.each(['right', 'wrong', 'locked'] as const)('takes no tap once %s', (state) => {
    expect(mount(OptionTile, { props: { keyHint: 1, label: 'C', state } }).attributes('disabled')).toBeDefined()
  })

  it('shows richer content in place of its label when given some', () => {
    const wrapper = mount(OptionTile, { props: { keyHint: 1, label: 'C' }, slots: { default: '<span data-test="custom">C ♯</span>' } })

    expect(wrapper.find('[data-test="option-label"] [data-test="custom"]').exists()).toBe(true)
  })
})
