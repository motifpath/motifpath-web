import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { CurrentUserState, RegistrationFailureReason } from '@/stores/currentUser'

const calls: string[] = []
const updateAccountName = vi.fn(async (first: string, last: string) => {
  calls.push(`rename ${first} ${last}`)
})
const signOut = vi.fn(async () => {})
vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    signOut,
    updateAccountName,
    accountName: computed(() => ({ firstName: 'Edu', lastName: '' })),
    startGoogleSignIn: vi.fn(),
  }),
}))

const currentUser = reactive({
  state: 'registering' as CurrentUserState,
  failureReason: null as RegistrationFailureReason,
  locale: 'en' as const,
  setLocale: vi.fn(),
  retry: vi.fn(async () => {
    calls.push('retry')
  }),
})
vi.mock('@/stores/currentUser', () => ({ useCurrentUserStore: () => currentUser }))

import AccountBridge from '@/features/auth/components/AccountBridge.vue'

const blank = { template: '<div />' }

async function mountBridge() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: blank },
      { path: '/sso-callback', name: 'sso-callback', component: blank },
      { path: '/welcome', name: 'registering', component: blank },
    ],
  })
  await router.push('/welcome')
  return mount(AccountBridge, { global: { plugins: [router] }, attachTo: document.body })
}

describe('AccountBridge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    calls.length = 0
    currentUser.state = 'registering'
    currentUser.failureReason = null
    currentUser.retry.mockClear()
    updateAccountName.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('while the account is being set up', () => {
    it('keeps the landing with the button unchanged at first, so a fast setup is never seen', async () => {
      const wrapper = await mountBridge()

      expect(wrapper.get('[data-test="google-button"]').attributes('aria-busy')).toBeUndefined()
      wrapper.unmount()
    })

    it('turns the button busy once setup has taken 300 ms', async () => {
      const wrapper = await mountBridge()

      vi.advanceTimersByTime(300)
      await nextTick()

      expect(wrapper.get('[data-test="google-button"]').text()).toContain('Setting up your account…')
      wrapper.unmount()
    })
  })

  describe('when setting the account up failed', () => {
    beforeEach(() => {
      currentUser.state = 'failed'
    })

    it('says Google sign-in worked and offers Try again and Sign out', async () => {
      const wrapper = await mountBridge()

      expect(wrapper.get('[role="alert"]').text()).toContain(
        "We couldn't set up your account. Your Google sign-in worked — try again in a moment.",
      )
      expect(wrapper.find('[data-test="sign-out"]').exists()).toBe(true)
      wrapper.unmount()
    })

    it('tries again on Try again', async () => {
      const wrapper = await mountBridge()

      await wrapper.get('[data-test="bridge-retry"]').trigger('click')

      expect(currentUser.retry).toHaveBeenCalledOnce()
      wrapper.unmount()
    })
  })

  describe('when the account has no full name', () => {
    beforeEach(() => {
      currentUser.state = 'failed'
      currentUser.failureReason = 'name-required'
    })

    it('asks for the name on our own screen, with what the account has filled in', async () => {
      const wrapper = await mountBridge()

      expect(wrapper.get('h1').text()).toBe('What should we call you?')
      expect(wrapper.findAll('input')[0].element.value).toBe('Edu')
      wrapper.unmount()
    })

    it('renames the account, then retries the registration', async () => {
      const wrapper = await mountBridge()

      await wrapper.findAll('input')[1].setValue('Souza')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(calls).toEqual(['rename Edu Souza', 'retry'])
      wrapper.unmount()
    })
  })
})
