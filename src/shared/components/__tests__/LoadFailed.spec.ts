import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LoadFailed from '@/shared/components/LoadFailed.vue'

describe('LoadFailed', () => {
  it('shows an error notice where the content would be, with Try again', async () => {
    const wrapper = mount(LoadFailed, { props: { message: "Your courses didn't load." } })

    const notice = wrapper.get('[data-test="inline-notice"]')
    expect(notice.text()).toContain("Your courses didn't load.")
    expect(notice.attributes('role')).toBe('alert')

    const retry = wrapper.get('[data-test="retry"]')
    expect(retry.text()).toBe('Try again')
    await retry.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('offers Try again as a secondary action, not the page primary', () => {
    const wrapper = mount(LoadFailed, { props: { message: 'Failed.' } })

    expect(wrapper.get('[data-test="retry"]').classes()).toContain('border-accent')
  })
})
