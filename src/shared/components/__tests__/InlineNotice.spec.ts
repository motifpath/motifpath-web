import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import InlineNotice from '@/shared/components/InlineNotice.vue'

describe('InlineNotice', () => {
  it('shows an error in place, announced as an alert', () => {
    const wrapper = mount(InlineNotice, { props: { message: "Your courses didn't load." } })

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.classes()).toContain('bg-danger-muted')
    expect(wrapper.find('svg.lucide-triangle-alert').exists()).toBe(true)
    expect(wrapper.text()).toBe("Your courses didn't load.")
  })

  it('shows what can’t be done here as unavailable, in its own tone and icon, not as an error', () => {
    const wrapper = mount(InlineNotice, { props: { message: 'There’s nothing to play on this instrument yet.', tone: 'unavailable' } })

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.classes()).toContain('bg-warning-muted')
    expect(wrapper.classes()).not.toContain('bg-danger-muted')
    expect(wrapper.find('svg.lucide-circle-alert').exists()).toBe(true)
  })
})
