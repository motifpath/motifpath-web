import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NotFoundView from '@/shared/components/NotFoundView.vue'

describe('NotFoundView', () => {
  it('is a not-found state with a way back home, not an error code', () => {
    const wrapper = mount(NotFoundView, { global: { stubs: { RouterLink: RouterLinkStub } } })

    expect(wrapper.get('h2').text()).toBe("This page isn't available")
    expect(wrapper.find('svg.lucide-search-x').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('404')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({ name: 'home' })
  })
})
