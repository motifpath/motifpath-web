import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import RegisteringNotice from '@/features/auth/components/RegisteringNotice.vue'

describe('RegisteringNotice', () => {
  it('shows the setting-up-your-account copy', () => {
    const wrapper = mount(RegisteringNotice)

    expect(wrapper.text()).toBe('Setting up your account…')
  })

  it('defaults its test id to "registering"', () => {
    const wrapper = mount(RegisteringNotice)

    expect(wrapper.find('[data-test="registering"]').exists()).toBe(true)
  })

  it('uses a custom test id when given one', () => {
    const wrapper = mount(RegisteringNotice, { props: { testId: 'loading' } })

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="registering"]').exists()).toBe(false)
  })
})
