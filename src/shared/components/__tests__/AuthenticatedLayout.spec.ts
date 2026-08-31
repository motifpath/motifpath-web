import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const signOut = vi.fn(async () => {})

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    isLoaded: { value: true },
    isSignedIn: { value: true },
    getToken: async () => 'jwt',
    signOut,
  }),
}))

import AuthenticatedLayout from '@/shared/components/AuthenticatedLayout.vue'

function mountLayout() {
  return mount(AuthenticatedLayout, {
    global: {
      stubs: { RouterLink: RouterLinkStub, RouterView: true },
    },
  })
}

describe('AuthenticatedLayout', () => {
  it('renders navigation to the main student routes', () => {
    const wrapper = mountLayout()

    const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))

    expect(targets).toContainEqual({ name: 'home' })
    expect(targets).toContainEqual({ name: 'path' })
  })

  it('signs the user out when the sign-out control is used', async () => {
    const wrapper = mountLayout()

    await wrapper.get('[data-test="sign-out"]').trigger('click')

    expect(signOut).toHaveBeenCalledOnce()
  })
})
