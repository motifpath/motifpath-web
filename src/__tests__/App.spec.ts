import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const auth = {
  isLoaded: ref(true),
  isSignedIn: ref(false),
  getToken: vi.fn(async () => null),
}

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => auth,
}))

const currentUser = {
  ensure: vi.fn(async () => {}),
  reset: vi.fn(),
}

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

vi.mock('@/features/auth/authBridge', () => ({
  updateAuthBridge: vi.fn(),
}))

import App from '@/App.vue'

let activeWrapper: VueWrapper | null = null

function mountApp() {
  activeWrapper = mount(App, { global: { stubs: { RouterView: true } } })
  return activeWrapper
}

describe('App', () => {
  beforeEach(() => {
    auth.isSignedIn.value = false
    currentUser.ensure.mockClear()
    currentUser.reset.mockClear()
  })

  afterEach(() => {
    activeWrapper?.unmount()
    activeWrapper = null
  })

  it('does not register while signed out', () => {
    mountApp()

    expect(currentUser.ensure).not.toHaveBeenCalled()
  })

  it('ensures registration once signed in', async () => {
    const wrapper = mountApp()

    auth.isSignedIn.value = true
    await wrapper.vm.$nextTick()

    expect(currentUser.ensure).toHaveBeenCalledOnce()
  })

  it('resets the current-user store on sign-out', async () => {
    auth.isSignedIn.value = true
    const wrapper = mountApp()
    await wrapper.vm.$nextTick()
    currentUser.reset.mockClear()

    auth.isSignedIn.value = false
    await wrapper.vm.$nextTick()

    expect(currentUser.reset).toHaveBeenCalledOnce()
  })
})
