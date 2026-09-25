import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as VueRouter from 'vue-router'

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

const route: { name?: string; meta: Record<string, unknown> } = { meta: {} }
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route }
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => ({ profile: { role: 'student' } }),
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
    route.meta = {}
    route.name = undefined
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

  it.each([
    ['path', 'My path'],
    ['node', 'My path'],
    ['practice', 'My path'],
    ['my-courses', 'My courses'],
    ['course-catalog', 'Find a course'],
  ])('marks the %s route under the %s tab', (routeName, tab) => {
    route.name = routeName
    const wrapper = mountLayout()

    const active = wrapper.findAllComponents(RouterLinkStub).filter((l) => l.classes().includes('bg-accent-muted'))

    expect(active.map((l) => l.text())).toEqual([tab])
  })

  it('renders the routed view', () => {
    const wrapper = mountLayout()

    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
  })

  it('uses the standard content width for an ordinary route', () => {
    const wrapper = mountLayout()

    expect(wrapper.get('main').classes()).toContain('max-w-4xl')
    expect(wrapper.get('main').classes()).not.toContain('max-w-7xl')
  })

  it("gives a route marked 'wideContent' a wider column, so it isn't squeezed into the usual width", () => {
    route.meta = { wideContent: true }

    const wrapper = mountLayout()

    expect(wrapper.get('main').classes()).toContain('max-w-7xl')
    expect(wrapper.get('main').classes()).not.toContain('max-w-4xl')
  })

  it('grows that column further still on a very large screen, rather than capping it the same as a laptop', () => {
    route.meta = { wideContent: true }

    const wrapper = mountLayout()

    expect(wrapper.get('main').classes()).toContain('2xl:max-w-[96rem]')
  })
})
