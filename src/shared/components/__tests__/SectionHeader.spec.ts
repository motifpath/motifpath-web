import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SectionHeader from '@/shared/components/SectionHeader.vue'

describe('SectionHeader', () => {
  it('shows an open section as a plain heading with its count', () => {
    const wrapper = mount(SectionHeader, { props: { label: 'Changes', count: '0 of 4' } })

    expect(wrapper.get('h3').text()).toContain('Changes')
    expect(wrapper.text()).toContain('0 of 4')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('shows a folded section as a button that unfolds it', async () => {
    const wrapper = mount(SectionHeader, { props: { label: 'Open chords', count: '5 of 5', foldable: true, expanded: false } })

    const toggle = wrapper.get('button')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('says when a foldable section is unfolded', () => {
    const wrapper = mount(SectionHeader, { props: { label: 'Open chords', count: '5 of 5', foldable: true, expanded: true } })

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
  })
})
