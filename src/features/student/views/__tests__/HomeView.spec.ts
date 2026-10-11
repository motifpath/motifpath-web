import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { CurrentUserState } from '@/stores/currentUser'

const auth = {
  isLoaded: ref(true),
  isSignedIn: ref(false),
}

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => auth,
}))

// `reactive()` mirrors Pinia's own auto-unwrapping of a setup store's refs, so
// `currentUser.isRegistered` reads like the real store property, not a raw ref.
const currentUser = reactive({
  isRegistered: ref(false),
  state: ref<CurrentUserState>('idle'),
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

const { StudentHome, LandingScreen, AccountBridge } = vi.hoisted(() => ({
  StudentHome: { name: 'StudentHome', template: '<div />' },
  LandingScreen: { name: 'LandingScreen', template: '<div />' },
  AccountBridge: { name: 'AccountBridge', template: '<div />' },
}))
vi.mock('@/features/student/components/StudentHome.vue', () => ({ default: StudentHome }))
vi.mock('@/features/auth/components/LandingScreen.vue', () => ({ default: LandingScreen }))
vi.mock('@/features/auth/components/AccountBridge.vue', () => ({ default: AccountBridge }))

import HomeView from '@/features/student/views/HomeView.vue'

function shown() {
  const wrapper = mount(HomeView)
  return {
    landing: wrapper.findComponent(LandingScreen).exists(),
    bridge: wrapper.findComponent(AccountBridge).exists(),
    home: wrapper.findComponent(StudentHome).exists(),
  }
}

describe('HomeView', () => {
  it('is the landing for a signed-out visitor', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = false

    expect(shown()).toEqual({ landing: true, bridge: false, home: false })
  })

  it('is the landing while Clerk is still loading, never a blank page', () => {
    auth.isLoaded.value = false
    auth.isSignedIn.value = false

    expect(shown()).toEqual({ landing: true, bridge: false, home: false })
  })

  it('is the account bridge while a signed-in visitor is still being set up', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = true
    currentUser.isRegistered = false
    currentUser.state = 'registering'

    expect(shown()).toEqual({ landing: false, bridge: true, home: false })
  })

  it('is the account bridge when setting the account up failed', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = true
    currentUser.isRegistered = false
    currentUser.state = 'failed'

    expect(shown()).toEqual({ landing: false, bridge: true, home: false })
  })

  it('opens on the student home when signed in and registered', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = true
    currentUser.isRegistered = true
    currentUser.state = 'registered'

    expect(shown()).toEqual({ landing: false, bridge: false, home: true })
  })
})
