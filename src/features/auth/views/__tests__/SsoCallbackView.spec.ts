import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const { Callback } = vi.hoisted(() => ({
  Callback: {
    name: 'AuthenticateWithRedirectCallback',
    props: ['signInForceRedirectUrl', 'signUpForceRedirectUrl', 'continueSignUpUrl', 'signInUrl', 'signUpUrl'],
    template: '<div />',
  },
}))
vi.mock('@clerk/vue', () => ({ AuthenticateWithRedirectCallback: Callback }))

vi.mock('@/features/auth/composables/useAuth', () => ({ useAuth: () => ({ startGoogleSignIn: vi.fn() }) }))
const currentUser = reactive({ locale: 'en' as const, setLocale: vi.fn() })
vi.mock('@/stores/currentUser', () => ({ useCurrentUserStore: () => currentUser }))

import SsoCallbackView from '@/features/auth/views/SsoCallbackView.vue'

const blank = defineComponent({ template: '<div />' })

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: blank },
      { path: '/sso-callback', name: 'sso-callback', component: blank },
      { path: '/welcome', name: 'registering', component: blank },
      { path: '/welcome/name', name: 'name-step', component: blank },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(SsoCallbackView, { global: { plugins: [router] } })
}

describe('SsoCallbackView', () => {
  it('finishes Google sign-in on the landing, never a blank page', async () => {
    const wrapper = await mountAt('/sso-callback')

    expect(wrapper.find('[data-test="google-button"]').exists()).toBe(true)
  })

  it('tells Clerk where each outcome goes, keeping where the visitor was heading', async () => {
    const wrapper = await mountAt('/sso-callback?redirect=/progress')

    expect(wrapper.getComponent(Callback).props()).toEqual({
      signInForceRedirectUrl: '/welcome?redirect=/progress',
      signUpForceRedirectUrl: '/welcome?redirect=/progress',
      continueSignUpUrl: '/welcome/name?redirect=/progress',
      signInUrl: '/?google=unfinished&redirect=/progress',
      signUpUrl: '/?google=unfinished&redirect=/progress',
    })
  })

  it('sends a sign-in with nowhere in particular to go to the account setup', async () => {
    const wrapper = await mountAt('/sso-callback')

    expect(wrapper.getComponent(Callback).props('signInForceRedirectUrl')).toBe('/welcome')
    expect(wrapper.getComponent(Callback).props('signInUrl')).toBe('/?google=unfinished')
  })
})
