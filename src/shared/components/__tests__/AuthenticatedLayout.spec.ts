import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub, RouterView: true },
    },
  })
}

describe('AuthenticatedLayout', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

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
