import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import { i18n } from '@/i18n'
import type { CurrentUserState } from '@/stores/currentUser'

const auth = {
  isLoaded: ref(true),
  isSignedIn: ref(false),
  getToken: vi.fn(async () => null),
}

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => auth,
}))

const updateClerkOptions = vi.fn()

vi.mock('@clerk/vue', () => ({
  updateClerkOptions: (...args: unknown[]) => updateClerkOptions(...args),
}))

const ptBrLocalization = { locale: 'pt-BR' }
const enUsLocalization = { locale: 'en-US' }
const loadClerkLocalization = vi.fn(async (locale: string) =>
  locale === 'pt-BR' ? ptBrLocalization : enUsLocalization,
)

vi.mock('@/shared/utils/clerkLocalization', () => ({
  loadClerkLocalization: (...args: [string]) => loadClerkLocalization(...args),
}))

// `reactive()` mirrors Pinia's own auto-unwrapping of a setup store's refs, so
// `currentUser.state` reads/writes like the real store property, not a raw ref.
const currentUser = reactive({
  state: ref<CurrentUserState>('idle'),
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
  updateRoleBridge: vi.fn(),
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
    auth.isLoaded.value = true
    currentUser.state = 'idle'
    currentUser.ensure.mockClear()
    currentUser.reset.mockClear()
    updateRegistrationBridge.mockClear()
    updateClerkOptions.mockClear()
    loadClerkLocalization.mockClear()
    i18n.global.locale.value = 'en'
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

  it('ensures registration immediately when already signed in at mount', () => {
    auth.isSignedIn.value = true

    mountApp()

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

  describe('Clerk localization sync', () => {
    it('does not update Clerk on mount for the locale already active', async () => {
      const wrapper = mountApp()
      await wrapper.vm.$nextTick()
      await Promise.resolve()

      expect(updateClerkOptions).not.toHaveBeenCalled()
    })

    it("updates Clerk's localization when the app locale changes, once Clerk is loaded", async () => {
      const wrapper = mountApp()

      i18n.global.locale.value = 'pt-BR'
      await wrapper.vm.$nextTick()
      await Promise.resolve()

      expect(loadClerkLocalization).toHaveBeenCalledWith('pt-BR')
      expect(updateClerkOptions).toHaveBeenCalledWith({ localization: ptBrLocalization })
    })

    it('does not update Clerk while it has not finished loading', async () => {
      auth.isLoaded.value = false
      const wrapper = mountApp()

      i18n.global.locale.value = 'pt-BR'
      await wrapper.vm.$nextTick()
      await Promise.resolve()

      expect(updateClerkOptions).not.toHaveBeenCalled()
    })

    it('catches up a locale change made before Clerk finished loading, once it does', async () => {
      auth.isLoaded.value = false
      const wrapper = mountApp()
      i18n.global.locale.value = 'pt-BR'
      await wrapper.vm.$nextTick()
      await Promise.resolve()
      expect(updateClerkOptions).not.toHaveBeenCalled()

      auth.isLoaded.value = true
      await wrapper.vm.$nextTick()
      await Promise.resolve()

      expect(updateClerkOptions).toHaveBeenCalledWith({ localization: ptBrLocalization })
    })

    it('does not re-sync when isLoaded flips true for a locale already synced at mount', async () => {
      auth.isLoaded.value = false
      const wrapper = mountApp()
      auth.isLoaded.value = true
      await wrapper.vm.$nextTick()
      await Promise.resolve()

      expect(updateClerkOptions).not.toHaveBeenCalled()
    })
  })
})
