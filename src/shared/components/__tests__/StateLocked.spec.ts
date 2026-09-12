import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import StateLocked from '@/shared/components/StateLocked.vue'

describe('StateLocked', () => {
  it('renders the locked message and a Back to path control', () => {
    const wrapper = mount(StateLocked, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.text()).toContain('Complete the previous step to unlock this lesson.')

    const link = wrapper.getComponent(RouterLinkStub)
    expect(link.text()).toBe('Back to path')
    expect(link.props('to')).toEqual({ name: 'path' })
  })
})
