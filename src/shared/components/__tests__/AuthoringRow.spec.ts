import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AuthoringRow from '@/shared/components/AuthoringRow.vue'

describe('AuthoringRow', () => {
  it('shows the title, one meta line and the status, and opens the item', () => {
    const wrapper = mount(AuthoringRow, {
      props: { title: 'Amazing Grace', meta: 'John Newton · English · Revision 2', status: { label: 'Published', tone: 'success' }, to: { name: 'admin-song-chart', params: { songChartId: 'c-1' } } },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.get('[data-test="authoring-row-title"]').text()).toBe('Amazing Grace')
    expect(wrapper.get('[data-test="authoring-row-meta"]').text()).toBe('John Newton · English · Revision 2')
    expect(wrapper.get('[data-test="authoring-row-status"]').text()).toBe('Published')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({ name: 'admin-song-chart', params: { songChartId: 'c-1' } })
  })

  it('shows no status chip for an item without a publish state', () => {
    const wrapper = mount(AuthoringRow, { props: { title: 'Name the note', meta: 'Guitar', status: null, to: '/x' }, global: { stubs: { RouterLink: RouterLinkStub } } })

    expect(wrapper.find('[data-test="authoring-row-status"]').exists()).toBe(false)
  })

  it('shows a thumbnail or a kind icon before the title when given one', () => {
    const wrapper = mount(AuthoringRow, {
      props: { title: 'Open chords', meta: 'Video', status: null, to: '/x' },
      slots: { leading: '<img data-test="row-thumbnail" />' },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const html = wrapper.html()
    expect(wrapper.find('[data-test="row-thumbnail"]').exists()).toBe(true)
    expect(html.indexOf('row-thumbnail')).toBeLessThan(html.indexOf('authoring-row-title'))
  })
})
