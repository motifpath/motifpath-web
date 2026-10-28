import { mount, RouterLinkStub, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref } from 'vue'
import type * as VueRouter from 'vue-router'

import { mockViewport } from '@/shared/testUtils/viewport'

vi.mock('@clerk/vue', () => ({
  useAuth: () => ({
    isLoaded: computed(() => true),
    isSignedIn: computed(() => true),
    getToken: computed(() => async () => 'jwt'),
    signOut: computed(() => async () => {}),
  }),
  useUser: () => ({ user: ref({ firstName: 'Ana', primaryEmailAddress: null }) }),
  useClerk: () => computed(() => null),
  useSignIn: () => ({ signIn: computed(() => undefined), setActive: computed(() => undefined) }),
  useSignUp: () => ({ signUp: computed(() => undefined), setActive: computed(() => undefined) }),
}))

const route = reactive<{ name?: string; meta: Record<string, unknown> }>({ name: 'admin-song-charts', meta: { requiresRole: ['admin'] } })
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route }
})

const { default: TeachShell } = await import('@/shared/components/TeachShell.vue')
const { useCurrentUserStore } = await import('@/stores/currentUser')

type Role = 'teacher' | 'admin'

let wrappers: VueWrapper[] = []

function mountShell({ width = 1280, role = 'admin' as Role, section = 'admin-song-charts', bar = 'back' as 'back' | 'home' | 'none' } = {}) {
  mockViewport(width)
  route.name = section
  const pinia = createPinia()
  setActivePinia(pinia)
  useCurrentUserStore().profile = {
    user_id: '00000000-0000-4000-8000-000000000001',
    role,
    display_name: 'Ana Souza',
    locale: { code: 'en', name: 'English' },
    email: null,
    time_zone: null,
    email_preferences: { progress_report: true, reminders: true },
    registered_at: '2026-01-01T00:00:00Z',
  }
  const wrapper = mount(TeachShell, {
    props: { section, bar },
    attachTo: document.body,
    slots: { default: '<p data-test="page">The page</p>' },
    global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub } },
  })
  wrappers.push(wrapper)
  return wrapper
}

const sidebarLinks = (wrapper: VueWrapper) =>
  wrapper.get('[data-test="teach-sidebar"]').findAllComponents(RouterLinkStub).filter((l: VueWrapper) => l.attributes('data-test') === 'teach-section')

afterEach(() => {
  wrappers.forEach((w) => w.unmount())
  wrappers = []
})

describe('TeachShell', () => {
  it('has no learner navigation', () => {
    const wrapper = mountShell()

    expect(wrapper.find('[data-test="nav-destination"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="page"]').text()).toBe('The page')
  })

  describe('on a wide screen', () => {
    it("lists a teacher's sections in the order things are composed", () => {
      const wrapper = mountShell({ role: 'teacher', section: 'teacher-content' })

      expect(sidebarLinks(wrapper).map((l: VueWrapper) => l.text())).toEqual(['Courses', 'Paths', 'Lessons', 'Exercises', 'Diagrams'])
      expect(wrapper.find('[data-test="teach-admin-label"]').exists()).toBe(false)
    })

    it('adds an Admin group for an admin, and marks the section the page is in', () => {
      const wrapper = mountShell()

      expect(sidebarLinks(wrapper).map((l: VueWrapper) => l.text())).toEqual(['Courses', 'Paths', 'Lessons', 'Exercises', 'Diagrams', 'Knowledge map', 'Song charts', 'Engagement'])
      expect(wrapper.get('[data-test="teach-admin-label"]').text()).toBe('Admin')
      const current = sidebarLinks(wrapper).find((l: VueWrapper) => l.attributes('aria-current') === 'page')
      expect(current?.text()).toBe('Song charts')
    })

    it('ends with Back to learning, which lands on Home, and the account', () => {
      const wrapper = mountShell()

      const back = wrapper.findAllComponents(RouterLinkStub).find((l: VueWrapper) => l.attributes('data-test') === 'teach-back-to-learning')
      expect(back?.text()).toBe('Back to learning')
      expect(back?.props('to')).toEqual({ name: 'home' })
      expect(wrapper.get('[data-test="teach-sidebar"]').find('[data-test="account-menu-avatar"]').exists()).toBe(true)
    })

    it('has no back bar, since the sidebar is there', () => {
      const wrapper = mountShell()

      expect(wrapper.find('[data-test="teach-back"]').exists()).toBe(false)
    })
  })

  describe.each([
    ['a phone', 390],
    ['a tablet', 768],
  ])('on %s', (_, width) => {
    it('has no sidebar, and a section page goes back to Teach', () => {
      const wrapper = mountShell({ width })

      expect(wrapper.find('[data-test="teach-sidebar"]').exists()).toBe(false)
      const back = wrapper.findAllComponents(RouterLinkStub).find((l: VueWrapper) => l.attributes('data-test') === 'teach-back')
      expect(back?.props('to')).toEqual({ name: 'teach' })
      expect(back?.text()).toBe('Teach')
    })

    it('leaves the bar to a page that brings its own', () => {
      const wrapper = mountShell({ width, bar: 'none' })

      expect(wrapper.find('[data-test="teach-back"]').exists()).toBe(false)
    })

    it("gives Teach home a bar with Teach and the account, and no way back", () => {
      const wrapper = mountShell({ width, bar: 'home' })

      expect(wrapper.get('[data-test="teach-home-bar"]').text()).toContain('Teach')
      expect(wrapper.find('[data-test="teach-back"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="account-menu-avatar"]').exists()).toBe(true)
    })
  })

describe('TeachShell at the device edges', () => {
  it.each(['home', 'back'] as const)('on a phone, starts the %s bar below the status bar', (bar) => {
    const wrapper = mountShell({ width: 390, bar })

    expect(wrapper.get('header').classes()).toEqual(expect.arrayContaining(['box-content', 'pt-inset-top']))
  })

  it('puts a backdrop behind the status bar when a page brings its own bar', () => {
    expect(mountShell({ width: 390, bar: 'none' }).find('[data-test="status-bar-backdrop"]').exists()).toBe(true)
  })

  it('keeps the sidebar clear of the status bar, the notch and the home indicator', () => {
    const edge = mountShell({ width: 1280 }).get('[data-test="side-navigation-edge"]')

    expect(edge.classes()).toEqual(expect.arrayContaining(['pl-inset-left', 'pt-inset-top', 'pb-inset-bottom']))
    expect(edge.find('[data-test="teach-sidebar"]').exists()).toBe(true)
  })
})
})
