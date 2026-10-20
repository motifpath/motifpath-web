import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AuthenticatedLayout from '@/shared/components/AuthenticatedLayout.vue'

describe('AuthenticatedLayout', () => {
  it('renders the routed view inside the App Shell', () => {
    const wrapper = shallowMount(AuthenticatedLayout, { global: { renderStubDefaultSlot: true } })

    const shell = wrapper.findComponent({ name: 'LearnerShell' })
    expect(shell.exists()).toBe(true)
    expect(shell.findComponent({ name: 'RouterView' }).exists()).toBe(true)
  })
})
