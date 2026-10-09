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
})
