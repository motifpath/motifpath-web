import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import GoogleButton from '@/shared/components/GoogleButton.vue'

describe('GoogleButton', () => {
  it('offers to continue with Google, with the G on its own disc', () => {
    const wrapper = mount(GoogleButton)

    expect(wrapper.text()).toContain('Continue with Google')
    expect(wrapper.find('[data-test="google-g"]').exists()).toBe(true)
  })

  it('reports a tap', async () => {
    const wrapper = mount(GoogleButton)

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('says the account is being set up while busy, and ignores taps', async () => {
    const wrapper = mount(GoogleButton, { props: { busy: true } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain('Setting up your account…')
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
