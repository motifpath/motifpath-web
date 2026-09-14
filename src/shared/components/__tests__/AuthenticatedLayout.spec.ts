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
    displayInitial: { value: 'G' },
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

  it('renders the AppBar with a link to the student path', () => {
    const wrapper = mountLayout()

    const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))

    expect(targets).toContainEqual({ name: 'path' })
  })

  it('renders the routed view', () => {
    const wrapper = mountLayout()

    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
  })
})
