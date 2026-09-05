import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/vue', () => ({
  SignIn: {
    name: 'SignIn',
    props: ['forceRedirectUrl', 'signUpForceRedirectUrl'],
    template: '<div />',
  },
}))

import SignInView from '@/features/auth/views/SignInView.vue'

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/sign-in', name: 'sign-in', component: SignInView },
      { path: '/welcome', name: 'registering', component: { template: '<div />' } },
    ],
  })
}

async function mountAt(fullPath: string) {
  const router = testRouter()
  await router.push(fullPath)
  await router.isReady()
  return mount(SignInView, { global: { plugins: [router] } })
}

describe('SignInView', () => {
  it('renders MotifPath chrome around the sign-in form', async () => {
    const wrapper = await mountAt('/sign-in')

    expect(wrapper.text()).toContain('MotifPath')
  })

  it('routes both sign-in and sign-up to /welcome when there is no redirect target', async () => {
    const wrapper = await mountAt('/sign-in')
    const signIn = wrapper.findComponent({ name: 'SignIn' })

    expect(signIn.props('forceRedirectUrl')).toBe('/welcome')
    expect(signIn.props('signUpForceRedirectUrl')).toBe('/welcome')
  })

  it('forwards the guard-preserved redirect target through /welcome', async () => {
    const wrapper = await mountAt('/sign-in?redirect=%2Fpath')
    const signIn = wrapper.findComponent({ name: 'SignIn' })

    // vue-router's own query stringification, via router.resolve() — not a
    // hand-built string — so `/` comes through literal rather than %2F.
    expect(signIn.props('forceRedirectUrl')).toBe('/welcome?redirect=/path')
    expect(signIn.props('signUpForceRedirectUrl')).toBe('/welcome?redirect=/path')
  })
})
