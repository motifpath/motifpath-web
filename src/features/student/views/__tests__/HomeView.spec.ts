import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { CurrentUserState } from '@/stores/currentUser'

const auth = {
  isLoaded: ref(true),
  isSignedIn: ref(false),
  signOut: vi.fn(async () => {}),
}

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => auth,
}))

// `reactive()` mirrors Pinia's own auto-unwrapping of a setup store's refs, so
// `currentUser.isRegistered` reads like the real store property, not a raw ref.
const currentUser = reactive({
  isRegistered: ref(false),
  state: ref<CurrentUserState>('idle'),
  retry: vi.fn(async () => {}),
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

const { PracticeDashboard } = vi.hoisted(() => ({
  PracticeDashboard: { name: 'PracticeDashboard', template: '<div />' },
}))
vi.mock('@/features/student/components/PracticeDashboard.vue', () => ({ default: PracticeDashboard }))

import HomeView from '@/features/student/views/HomeView.vue'

function mountView() {
  return mount(HomeView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('HomeView', () => {
  it('shows a loading state until Clerk resolves', () => {
    auth.isLoaded.value = false

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('offers sign-in when signed out', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = false

    const link = mountView().getComponent(RouterLinkStub)

    expect(link.props('to')).toEqual({ name: 'sign-in' })
  })

  it('opens on the practice dashboard when signed in and registered', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = true
    currentUser.isRegistered = true
    currentUser.state = 'registered'

    const wrapper = mountView()

    expect(wrapper.findComponent(PracticeDashboard).exists()).toBe(true)
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0)
  })

  it('shows no practice dashboard while signed out', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = false

    expect(mountView().findComponent(PracticeDashboard).exists()).toBe(false)
  })

  it('shows a neutral loading line, with no dead link, while signed in but not yet registered', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = true
    currentUser.isRegistered = false
    currentUser.state = 'registering'

    const wrapper = mountView()

    expect(wrapper.find('[data-test="registering"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0)
  })

  it('offers a retry control, not a dead end, when registration failed', async () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = true
    currentUser.isRegistered = false
    currentUser.state = 'failed'

    const wrapper = mountView()
    const retryButton = wrapper.get('[data-test="registration-failed"] [data-test="retry"]')
    await retryButton.trigger('click')

    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0)
    expect(currentUser.retry).toHaveBeenCalledOnce()
  })
})
