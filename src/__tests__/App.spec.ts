import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

const auth = {
  isLoaded: ref(true),
  isSignedIn: ref(false),
  getToken: vi.fn(async () => null),
}

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => auth,
}))

// `reactive()` mirrors Pinia's own auto-unwrapping of a setup store's refs, so
// `currentUser.state` reads/writes like the real store property, not a raw ref.
const currentUser = reactive({
  state: ref<'idle' | 'registering' | 'registered' | 'failed'>('idle'),
  ensure: vi.fn(async () => {}),
  reset: vi.fn(),
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

const updateRegistrationBridge = vi.fn()

vi.mock('@/features/auth/authBridge', () => ({
  updateAuthBridge: vi.fn(),
  updateRegistrationBridge: (...args: unknown[]) => updateRegistrationBridge(...args),
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
    currentUser.state = 'idle'
    currentUser.ensure.mockClear()
    currentUser.reset.mockClear()
    updateRegistrationBridge.mockClear()
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

  it('pushes registration state changes into the bridge', async () => {
    const wrapper = mountApp()
    updateRegistrationBridge.mockClear()

    currentUser.state = 'registering'
    await wrapper.vm.$nextTick()
    expect(updateRegistrationBridge).toHaveBeenLastCalledWith('registering')

    currentUser.state = 'registered'
    await wrapper.vm.$nextTick()
    expect(updateRegistrationBridge).toHaveBeenLastCalledWith('registered')
  })
})
