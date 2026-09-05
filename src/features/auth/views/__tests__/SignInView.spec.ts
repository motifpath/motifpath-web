import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/vue', () => ({
  SignIn: {
    name: 'SignIn',
    props: ['forceRedirectUrl', 'signUpForceRedirectUrl'],
    template: '<div />',
  },
}))

import SignInView from '@/features/auth/views/SignInView.vue'

describe('SignInView', () => {
  it('renders MotifPath chrome around the sign-in form', () => {
    const wrapper = mount(SignInView)

    expect(wrapper.text()).toContain('MotifPath')
  })

  it('routes both sign-in and sign-up through the registration bridge', () => {
    const wrapper = mount(SignInView)
    const signIn = wrapper.findComponent({ name: 'SignIn' })

    expect(signIn.props('forceRedirectUrl')).toBe('/welcome')
    expect(signIn.props('signUpForceRedirectUrl')).toBe('/welcome')
  })
})
