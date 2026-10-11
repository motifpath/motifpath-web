import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ImageOption from '@/shared/components/ImageOption.vue'

describe('ImageOption', () => {
  it('shows its picture, its key and its label', () => {
    const wrapper = mount(ImageOption, { props: { keyHint: 2, label: 'Am' }, slots: { default: '<img data-test="pic" src="x.png" alt="" />' } })

    expect(wrapper.find('[data-test="option-media"] [data-test="pic"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="key-hint"]').text()).toBe('2')
    expect(wrapper.get('[data-test="option-label"]').text()).toBe('Am')
  })

  it('shows no label when it has none', () => {
    expect(mount(ImageOption, { props: { keyHint: 1 } }).find('[data-test="option-label"]').exists()).toBe(false)
  })

  it('is tapped like a button, and says whether it is chosen', async () => {
    const wrapper = mount(ImageOption, { props: { keyHint: 1, state: 'selected' } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })

  it('marks a wrong option with an icon and words, and takes no more taps', () => {
    const wrapper = mount(ImageOption, { props: { keyHint: 1, state: 'wrong' } })

    expect(wrapper.get('[data-test="answer-mark"]').text()).toBe('Your answer, wrong')
    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
