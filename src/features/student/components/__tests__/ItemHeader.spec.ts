import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ItemHeader from '@/features/student/components/ItemHeader.vue'

describe('ItemHeader', () => {
  it('names the item as its heading, with why it was picked under it', () => {
    const wrapper = mount(ItemHeader, { props: { title: 'Hear the third', reason: 'due' } })

    expect(wrapper.get('h2[data-test="item-title"]').text()).toBe('Hear the third')
    expect(wrapper.get('[data-test="item-reason"]').text()).toBe('Due for review')
  })

  it('names each reason the way the plan does', () => {
    const wrapper = mount(ItemHeader, { props: { title: 'Major triads, region 1', reason: 'application' } })

    expect(wrapper.get('[data-test="item-reason"]').text()).toBe('Put it into music')
  })

  it('shows a tag in place of a reason for an item no session picked', () => {
    const wrapper = mount(ItemHeader, { props: { title: 'Inversions of C major', tag: 'Challenge' } })

    expect(wrapper.get('[data-test="item-reason"]').text()).toBe('Challenge')
  })
})
