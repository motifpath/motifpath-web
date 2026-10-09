import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, RouterLinkStub, type VueWrapper } from '@vue/test-utils'

import { reactive } from 'vue'

import AccountMenu from '@/shared/components/AccountMenu.vue'

const currentUser = reactive({ profile: null as { role: 'student' | 'teacher' | 'admin' } | null })
vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

const { default: AppBar } = await import('@/shared/components/AppBar.vue')

function mockMatchMedia(prefersDark = false): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' && prefersDark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

interface Props {
  compact?: boolean
  primaryNavTo?: { name: string }
  breadcrumbLabel?: string
  showSave?: boolean
  saveDisabled?: boolean
  justSaved?: boolean
  onSave?: () => void
}

// Every tab/drawer link — the wordmark's home link is not a nav tab.
function navLinks(wrapper: VueWrapper) {
  return wrapper.findAllComponents(RouterLinkStub).filter((l) => l.attributes('data-test') !== 'app-bar-home')
}

function mountBar(props: Props = {}) {
  return mount(AppBar, {
    props: { primaryNavTo: { name: 'teacher-exercises' }, ...props },
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub, AccountMenu: true },
    },
  })
}

describe('AppBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    currentUser.profile = { role: 'teacher' }
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockMatchMedia()
  })

  it('renders the wordmark', () => {
    const wrapper = mountBar()

    expect(wrapper.text()).toContain('MotifPath')
  })

  it('sticks to the top of the viewport, so it stays reachable on a long scrolling page', () => {
    const wrapper = mountBar()

    expect(wrapper.classes()).toContain('sticky')
    expect(wrapper.classes()).toContain('top-0')
  })

  it('links the wordmark to home', () => {
    const wrapper = mountBar()

    const home = wrapper.get('[data-test="app-bar-home"]')
    expect(home.text()).toContain('MotifPath')
    const homeLink = wrapper.findAllComponents(RouterLinkStub).find((l) => l.attributes('data-test') === 'app-bar-home')
    expect(homeLink?.props().to).toEqual({ name: 'home' })
  })

  it("shows an 'Exercises' link with no breadcrumb", () => {
    const wrapper = mountBar({ primaryNavTo: { name: 'teacher-exercises' } })

    const links = navLinks(wrapper)
    expect(links.some((l) => l.text() === 'Exercises')).toBe(true)
  })

  it('shows a breadcrumb (Exercises root + label) with a breadcrumb label', () => {
    const wrapper = mountBar({
      primaryNavTo: { name: 'teacher-exercises' },
      breadcrumbLabel: 'New exercise',
    })

    expect(wrapper.text()).toContain('Exercises')
    expect(wrapper.text()).toContain('New exercise')
  })

  it('shows a Content-rooted breadcrumb when primaryNavTo points at the content section', () => {
    const wrapper = mountBar({
      primaryNavTo: { name: 'teacher-content' },
      breadcrumbLabel: 'New content',
    })

    expect(wrapper.text()).toContain('Content')
    expect(wrapper.text()).toContain('New content')
  })

  it('shows all five teacher tabs (Content, Paths, Courses, Exercises, Diagrams) with no breadcrumb', () => {
    const wrapper = mountBar({ primaryNavTo: { name: 'teacher-exercises' } })

    const links = navLinks(wrapper)
    expect(links.map((l) => l.text())).toEqual(['Content', 'Paths', 'Courses', 'Exercises', 'Diagrams'])
  })

  it('offers admins the Knowledge map tab after the authoring tabs', () => {
    currentUser.profile = { role: 'admin' }
    const wrapper = mountBar({ primaryNavTo: { name: 'admin-knowledge-map' } })

    const links = navLinks(wrapper)
    expect(links.map((l) => l.text())).toEqual(['Content', 'Paths', 'Courses', 'Exercises', 'Diagrams', 'Knowledge map', 'Song charts'])
    expect(links.find((l) => l.text() === 'Knowledge map')?.classes()).toContain('bg-accent-muted')
  })

  it('highlights the Song charts tab on the song chart pages', () => {
    currentUser.profile = { role: 'admin' }
    const wrapper = mountBar({ primaryNavTo: { name: 'admin-song-charts' } })

    expect(navLinks(wrapper).find((l) => l.text() === 'Song charts')?.classes()).toContain('bg-accent-muted')
  })

  it('never offers teachers the Knowledge map tab', () => {
    currentUser.profile = { role: 'teacher' }

    const authoring = navLinks(mountBar({ primaryNavTo: { name: 'teacher-paths' } }))

    expect(authoring.some((l) => l.text() === 'Knowledge map')).toBe(false)
    expect(authoring.some((l) => l.text() === 'Song charts')).toBe(false)
  })

  it('highlights the tab matching primaryNavTo as active', () => {
    const wrapper = mountBar({ primaryNavTo: { name: 'teacher-paths' } })

    const links = navLinks(wrapper)
    const pathsTab = links.find((l) => l.text() === 'Paths')
    const contentTab = links.find((l) => l.text() === 'Content')
    expect(pathsTab?.classes()).toContain('bg-accent-muted')
    expect(contentTab?.classes()).not.toContain('bg-accent-muted')
  })

  it('falls back to the Exercises tab and warns when primaryNavTo names an unknown teacher section', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const wrapper = mountBar({ primaryNavTo: { name: 'teacher-reports' } })

    const links = navLinks(wrapper)
    const exercisesTab = links.find((l) => l.text() === 'Exercises')
    expect(exercisesTab?.classes()).toContain('bg-accent-muted')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('teacher-reports'))

    warn.mockRestore()
  })

  it('shows all five teacher tabs in the compact drawer', async () => {
    const wrapper = mountBar({ primaryNavTo: { name: 'teacher-content' }, compact: true })

    await wrapper.get('[data-test="app-bar-menu"]').trigger('click')

    const drawerLinks = wrapper.get('[data-test="app-bar-drawer"]').findAllComponents(RouterLinkStub)
    expect(drawerLinks.map((link: { text: () => string }) => link.text())).toEqual(['Content', 'Paths', 'Courses', 'Exercises', 'Diagrams'])
  })

  it('hides the hamburger and shows inline nav when not compact', () => {
    const wrapper = mountBar()

    expect(wrapper.find('[data-test="app-bar-menu"]').exists()).toBe(false)
    expect(navLinks(wrapper)).not.toHaveLength(0)
  })

  it('shows the hamburger and hides inline nav when compact', () => {
    const wrapper = mountBar({ compact: true })

    expect(wrapper.find('[data-test="app-bar-menu"]').exists()).toBe(true)
    expect(navLinks(wrapper)).toHaveLength(0)
  })

  it('opens a nav-only drawer with the primary nav link when the hamburger is clicked', async () => {
    const wrapper = mountBar({ compact: true })

    expect(wrapper.find('[data-test="app-bar-drawer"]').exists()).toBe(false)

    await wrapper.get('[data-test="app-bar-menu"]').trigger('click')

    expect(wrapper.find('[data-test="app-bar-drawer"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="app-bar-drawer"]').findComponent(RouterLinkStub).text()).toBe('Content')
  })

  it('closes the drawer when its nav link is clicked', async () => {
    const wrapper = mountBar({ compact: true })
    await wrapper.get('[data-test="app-bar-menu"]').trigger('click')

    await wrapper.get('[data-test="app-bar-drawer"]').findComponent(RouterLinkStub).trigger('click')

    expect(wrapper.find('[data-test="app-bar-drawer"]').exists()).toBe(false)
  })

  it('does not render the Save button by default', () => {
    const wrapper = mountBar()

    expect(wrapper.find('[data-test="app-bar-save"]').exists()).toBe(false)
  })

  it('renders the Save button and calls onSave when clicked', async () => {
    const onSave = vi.fn()
    const wrapper = mountBar({ showSave: true, onSave })

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')

    expect(onSave).toHaveBeenCalled()
  })

  it('disables the Save button when saveDisabled is true', () => {
    const wrapper = mountBar({ showSave: true, saveDisabled: true })

    expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeDefined()
  })

  it('does not disable the Save button by default', () => {
    const wrapper = mountBar({ showSave: true })

    expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeUndefined()
  })

  it('renders page-specific save actions in the bar, just before Save', () => {
    const wrapper = mount(AppBar, {
      props: { primaryNavTo: { name: 'path' }, showSave: true },
      slots: { actions: '<button data-test="page-action">Save as…</button>' },
      global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub, AccountMenu: true } },
    })

    const action = wrapper.get('[data-test="page-action"]')
    const save = wrapper.get('[data-test="app-bar-save"]')
    expect(action.element.compareDocumentPosition(save.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders page-specific save actions even when there is no plain Save', () => {
    const wrapper = mount(AppBar, {
      props: { primaryNavTo: { name: 'path' } },
      slots: { actions: '<button data-test="page-action">Save as…</button>' },
      global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub, AccountMenu: true } },
    })

    expect(wrapper.find('[data-test="page-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="app-bar-save"]').exists()).toBe(false)
  })

  it('renders a "Saved" indicator when justSaved is true', () => {
    const wrapper = mountBar({ justSaved: true })

    expect(wrapper.text()).toContain('Saved')
  })

  it('has no theme toggle of its own: Appearance lives in the account menu', () => {
    const wrapper = mountBar()

    expect(wrapper.find('[data-test="app-bar-theme-toggle"]').exists()).toBe(false)
  })

  it('renders the account menu', () => {
    const wrapper = mountBar()

    // AccountMenu owns the avatar/menu/sign-out behavior itself and is
    // tested in isolation — see AccountMenu.spec.ts.
    expect(wrapper.findComponent(AccountMenu).exists()).toBe(true)
  })
})
