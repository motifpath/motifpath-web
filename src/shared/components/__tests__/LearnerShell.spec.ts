import { mount, RouterLinkStub, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, reactive, ref } from 'vue'
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
}))

const route = reactive<{ name?: string; meta: Record<string, unknown> }>({ name: 'home', meta: {} })
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route }
})

const { default: LearnerShell } = await import('@/shared/components/LearnerShell.vue')
const { useCurrentUserStore } = await import('@/stores/currentUser')

type Role = 'student' | 'teacher' | 'admin'

let wrappers: VueWrapper[] = []

function mountShell({ width = 390, role = 'student' as Role } = {}) {
  mockViewport(width)
  const pinia = createPinia()
  setActivePinia(pinia)
  useCurrentUserStore().profile = {
    user_id: '00000000-0000-4000-8000-000000000001',
    role,
    display_name: 'Ana Souza',
    locale: { code: 'en', name: 'English' },
    registered_at: '2026-01-01T00:00:00Z',
  }
  const wrapper = mount(LearnerShell, {
    attachTo: document.body,
    slots: { default: '<p data-test="page">The page</p>' },
    global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub } },
  })
  wrappers.push(wrapper)
  return wrapper
}

const has = (wrapper: VueWrapper, test: string) => wrapper.find(`[data-test="${test}"]`).exists()
const toastClearance = () => document.documentElement.style.getPropertyValue('--toast-clearance')

describe('LearnerShell', () => {
  beforeEach(() => {
    route.name = 'home'
    route.meta = {}
  })
  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount())
    wrappers = []
  })

  it('renders the page', () => {
    expect(has(mountShell(), 'page')).toBe(true)
  })

  it('on a phone, shows a bottom navigation bar and no menu button', () => {
    const wrapper = mountShell({ width: 390 })

    expect(has(wrapper, 'navigation-bar')).toBe(true)
    expect(has(wrapper, 'navigation-rail')).toBe(false)
    expect(has(wrapper, 'navigation-sidebar')).toBe(false)
    expect(has(wrapper, 'app-bar-menu')).toBe(false)
  })

  it('on a phone, keeps the account avatar in a slim top bar', () => {
    const wrapper = mountShell({ width: 390 })

    expect(wrapper.get('[data-test="learner-top-bar"]').find('[data-test="account-menu-avatar"]').exists()).toBe(true)
  })

  it('on a tablet, shows a navigation rail on the left instead', () => {
    const wrapper = mountShell({ width: 720 })

    expect(has(wrapper, 'navigation-rail')).toBe(true)
    expect(has(wrapper, 'navigation-bar')).toBe(false)
    expect(has(wrapper, 'navigation-sidebar')).toBe(false)
    expect(has(wrapper, 'learner-top-bar')).toBe(false)
  })

  it('on a desktop, shows a sidebar instead', () => {
    const wrapper = mountShell({ width: 1280 })

    expect(has(wrapper, 'navigation-sidebar')).toBe(true)
    expect(has(wrapper, 'navigation-bar')).toBe(false)
    expect(has(wrapper, 'navigation-rail')).toBe(false)
  })

  it('follows the window when it crosses a size class', async () => {
    const viewport = mockViewport(390)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(LearnerShell, { global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub } } })
    wrappers.push(wrapper)

    viewport.resize(1280)
    await nextTick()

    expect(has(wrapper, 'navigation-sidebar')).toBe(true)
    expect(has(wrapper, 'navigation-bar')).toBe(false)
  })

  it.each([
    ['node', 'My path'],
    ['course-completed', 'Learning'],
    ['path-detail', 'Discover'],
  ])('marks the destination the %s route sits under', (routeName, label) => {
    route.name = routeName
    const wrapper = mountShell()

    expect(wrapper.get('[aria-current="page"]').text()).toBe(label)
  })

  it.each(['teacher', 'admin'] as const)('on a desktop, gives a %s Teach in the sidebar', (role) => {
    expect(has(mountShell({ width: 1280, role }), 'nav-teach')).toBe(true)
  })

  it('never gives a student Teach in the sidebar', () => {
    expect(has(mountShell({ width: 1280, role: 'student' }), 'nav-teach')).toBe(false)
  })

  it('opens the account menu from the "Account" row at the foot of the sidebar', () => {
    const wrapper = mountShell({ width: 1280 })

    expect(wrapper.get('[data-test="navigation-sidebar"]').get('[data-test="account-menu-avatar"]').text()).toBe('Account')
  })

  it('on a phone, hides the bottom bar on a page that asks for the full height (a lesson)', () => {
    route.name = 'node'
    route.meta = { hidesBottomBar: true }

    expect(has(mountShell({ width: 390 }), 'navigation-bar')).toBe(false)
  })

  it('on a phone, leaves the top of the screen to a pushed page, which brings its own back bar', () => {
    route.name = 'node'
    route.meta = { hidesBottomBar: true, pushed: true }

    expect(has(mountShell({ width: 390 }), 'learner-top-bar')).toBe(false)
  })

  it('keeps the rail on a tablet for that page', () => {
    route.name = 'node'
    route.meta = { hidesBottomBar: true }

    expect(has(mountShell({ width: 720 }), 'navigation-rail')).toBe(true)
  })

  it('links to the credits', () => {
    const links = mountShell().findAllComponents(RouterLinkStub).map((link) => link.props('to'))

    expect(links).toContainEqual({ name: 'credits' })
  })

  it('uses the reading-width content column for an ordinary route', () => {
    const main = mountShell().get('main')

    expect(main.classes()).toContain('max-w-4xl')
    expect(main.classes()).not.toContain('max-w-7xl')
  })

  it("gives a route marked 'wideContent' a wider column, growing again on a very large screen", () => {
    route.meta = { wideContent: true }
    const main = mountShell().get('main')

    expect(main.classes()).toContain('max-w-7xl')
    expect(main.classes()).toContain('2xl:max-w-[96rem]')
    expect(main.classes()).not.toContain('max-w-4xl')
  })

  describe('toasts', () => {
    it('are lifted above the bottom bar while it shows', () => {
      mountShell({ width: 390 })

      expect(toastClearance()).not.toBe('')
    })

    it('keep their usual place when there is no bottom bar', () => {
      mountShell({ width: 1280 })

      expect(toastClearance()).toBe('')
    })

    it('go back to their usual place when the shell goes away', () => {
      const wrapper = mountShell({ width: 390 })
      wrapper.unmount()
      wrappers = []

      expect(toastClearance()).toBe('')
    })
  })
})
