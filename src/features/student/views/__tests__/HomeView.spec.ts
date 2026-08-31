import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const auth = {
  isLoaded: ref(true),
  isSignedIn: ref(false),
}

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => auth,
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

  it('links to the learning path when signed in', () => {
    auth.isLoaded.value = true
    auth.isSignedIn.value = true

    const link = mountView().getComponent(RouterLinkStub)

    expect(link.props('to')).toEqual({ name: 'path' })
  })
})
