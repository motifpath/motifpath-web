import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

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
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

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

  it('links to the learning path when signed in and registered', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = true
    currentUser.isRegistered = true

    const link = mountView().getComponent(RouterLinkStub)

    expect(link.props('to')).toEqual({ name: 'path' })
  })

  it('shows a neutral loading line, with no dead link, while signed in but not yet registered', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = true
    currentUser.isRegistered = false

    const wrapper = mountView()

    expect(wrapper.find('[data-test="registering"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0)
  })
})
