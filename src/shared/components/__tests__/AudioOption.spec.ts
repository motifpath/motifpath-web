import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AudioOption from '@/shared/components/AudioOption.vue'

describe('AudioOption', () => {
  it('selects when its row is tapped, without playing', async () => {
    const wrapper = mount(AudioOption, { props: { label: 'Sound 2' } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('play')).toBeUndefined()
  })

  it('plays from its play button, without selecting', async () => {
    const wrapper = mount(AudioOption, { props: { label: 'Sound 2' } })

    await wrapper.get('[data-test="option-play"]').trigger('click')

    expect(wrapper.emitted('play')).toHaveLength(1)
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('names what its play button does', () => {
    expect(mount(AudioOption, { props: { label: 'Sound 2' } }).get('[data-test="option-play"]').attributes('aria-label')).toBe('Play Sound 2')
    expect(mount(AudioOption, { props: { label: 'Sound 2', playing: true } }).get('[data-test="option-play"]').attributes('aria-label')).toBe('Stop Sound 2')
  })

  it('says whether it is chosen', () => {
    expect(mount(AudioOption, { props: { label: 'Sound 2', state: 'selected' } }).get('[data-test="option-label"]').attributes('aria-pressed')).toBe('true')
  })

  it('marks a right option with an icon and words', () => {
    const wrapper = mount(AudioOption, { props: { label: 'Sound 2', state: 'right' } })

    expect(wrapper.get('[data-test="answer-mark"]').text()).toBe('Right answer')
  })

  it('takes no choice once settled, but still plays', async () => {
    const wrapper = mount(AudioOption, { props: { label: 'Sound 2', state: 'locked' } })

    await wrapper.trigger('click')
    await wrapper.get('[data-test="option-play"]').trigger('click')

    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.emitted('play')).toHaveLength(1)
  })
})
