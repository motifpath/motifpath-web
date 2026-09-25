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
  context: 'student' | 'teacher'
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

function mountBar(props: Props) {
  return mount(AppBar, {
    props: { primaryNavTo: { name: 'path' }, ...props },
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub, AccountMenu: true },
    },
  })
}

describe('AppBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    currentUser.profile = { role: 'student' }
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockMatchMedia()
  })

  it('renders the wordmark', () => {
    const wrapper = mountBar({ context: 'student' })

    expect(wrapper.text()).toContain('MotifPath')
  })

  it('sticks to the top of the viewport, so it stays reachable on a long scrolling page', () => {
    const wrapper = mountBar({ context: 'student' })

    expect(wrapper.classes()).toContain('sticky')
    expect(wrapper.classes()).toContain('top-0')
  })

  it('shows the three student tabs (My path, My courses, Find a course)', () => {
    const wrapper = mountBar({ context: 'student', primaryNavTo: { name: 'path' } })

    const links = navLinks(wrapper)
    expect(links.map((l) => l.text())).toEqual(['My path', 'My courses', 'Find a course'])
    expect(links.map((l) => l.props('to'))).toEqual([
      { name: 'path' },
      { name: 'my-courses' },
      { name: 'course-catalog' },
    ])
  })

  it('links the wordmark to home', () => {
    const wrapper = mountBar({ context: 'student' })

    const home = wrapper.get('[data-test="app-bar-home"]')
    expect(home.text()).toContain('MotifPath')
    const homeLink = wrapper.findAllComponents(RouterLinkStub).find((l) => l.attributes('data-test') === 'app-bar-home')
    expect(homeLink?.props().to).toEqual({ name: 'home' })
  })

  it('shows an admin every student tab, since an admin can use the learner side too', () => {
    currentUser.profile = { role: 'admin' }

    const links = navLinks(mountBar({ context: 'student' }))

    expect(links.map((l) => l.text())).toEqual(['My path', 'My courses', 'Find a course'])
  })

  it('shows a teacher every student tab too, since everyone can learn', () => {
    currentUser.profile = { role: 'teacher' }

    const links = navLinks(mountBar({ context: 'student' }))

    expect(links.map((l) => l.text())).toEqual(['My path', 'My courses', 'Find a course'])
  })

  it('highlights the student tab matching primaryNavTo as active', () => {
    const wrapper = mountBar({ context: 'student', primaryNavTo: { name: 'course-catalog' } })

    const links = navLinks(wrapper)
    expect(links.find((l) => l.text() === 'Find a course')?.classes()).toContain('bg-accent-muted')
    expect(links.find((l) => l.text() === 'My path')?.classes()).not.toContain('bg-accent-muted')
  })

  it('shows the three student tabs in the compact drawer', async () => {
    const wrapper = mountBar({ context: 'student', primaryNavTo: { name: 'my-courses' }, compact: true })

    await wrapper.get('[data-test="app-bar-menu"]').trigger('click')

    const drawerLinks = wrapper.get('[data-test="app-bar-drawer"]').findAllComponents(RouterLinkStub)
    expect(drawerLinks.map((link: { text: () => string }) => link.text())).toEqual(['My path', 'My courses', 'Find a course'])
    expect(drawerLinks[1]!.classes()).toContain('bg-accent-muted')
  })

  it("shows an 'Exercises' link for teacher context with no breadcrumb", () => {
    const wrapper = mountBar({ context: 'teacher', primaryNavTo: { name: 'teacher-exercises' } })

    const links = navLinks(wrapper)
    expect(links.some((l) => l.text() === 'Exercises')).toBe(true)
    expect(wrapper.text()).not.toContain('My path')
  })

  it('shows a breadcrumb (Exercises root + label) for teacher context with a breadcrumb label', () => {
    const wrapper = mountBar({
      context: 'teacher',
      primaryNavTo: { name: 'teacher-exercises' },
      breadcrumbLabel: 'New exercise',
    })

    expect(wrapper.text()).toContain('Exercises')
    expect(wrapper.text()).toContain('New exercise')
  })

  it('shows a Content-rooted breadcrumb when primaryNavTo points at the content section', () => {
    const wrapper = mountBar({
      context: 'teacher',
      primaryNavTo: { name: 'teacher-content' },
      breadcrumbLabel: 'New content',
    })

    expect(wrapper.text()).toContain('Content')
    expect(wrapper.text()).toContain('New content')
  })

  it('shows all four teacher tabs (Content, Paths, Exercises, Diagrams) with no breadcrumb', () => {
    const wrapper = mountBar({ context: 'teacher', primaryNavTo: { name: 'teacher-exercises' } })

    const links = navLinks(wrapper)
    expect(links.map((l) => l.text())).toEqual(['Content', 'Paths', 'Exercises', 'Diagrams'])
  })

  it('highlights the tab matching primaryNavTo as active', () => {
    const wrapper = mountBar({ context: 'teacher', primaryNavTo: { name: 'teacher-paths' } })

    const links = navLinks(wrapper)
    const pathsTab = links.find((l) => l.text() === 'Paths')
    const contentTab = links.find((l) => l.text() === 'Content')
    expect(pathsTab?.classes()).toContain('bg-accent-muted')
    expect(contentTab?.classes()).not.toContain('bg-accent-muted')
  })

  it('falls back to the Exercises tab and warns when primaryNavTo names an unknown teacher section', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const wrapper = mountBar({ context: 'teacher', primaryNavTo: { name: 'teacher-reports' } })

    const links = navLinks(wrapper)
    const exercisesTab = links.find((l) => l.text() === 'Exercises')
    expect(exercisesTab?.classes()).toContain('bg-accent-muted')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('teacher-reports'))

    warn.mockRestore()
  })

  it('shows all four teacher tabs in the compact drawer', async () => {
    const wrapper = mountBar({ context: 'teacher', primaryNavTo: { name: 'teacher-content' }, compact: true })

    await wrapper.get('[data-test="app-bar-menu"]').trigger('click')

    const drawerLinks = wrapper.get('[data-test="app-bar-drawer"]').findAllComponents(RouterLinkStub)
    expect(drawerLinks.map((link: { text: () => string }) => link.text())).toEqual(['Content', 'Paths', 'Exercises', 'Diagrams'])
  })

  it('hides the hamburger and shows inline nav when not compact', () => {
    const wrapper = mountBar({ context: 'student' })

    expect(wrapper.find('[data-test="app-bar-menu"]').exists()).toBe(false)
    expect(navLinks(wrapper)).not.toHaveLength(0)
  })

  it('shows the hamburger and hides inline nav when compact', () => {
    const wrapper = mountBar({ context: 'student', compact: true })

    expect(wrapper.find('[data-test="app-bar-menu"]').exists()).toBe(true)
    expect(navLinks(wrapper)).toHaveLength(0)
  })

  it('opens a nav-only drawer with the primary nav link when the hamburger is clicked', async () => {
    const wrapper = mountBar({ context: 'student', compact: true })

    expect(wrapper.find('[data-test="app-bar-drawer"]').exists()).toBe(false)

    await wrapper.get('[data-test="app-bar-menu"]').trigger('click')

    expect(wrapper.find('[data-test="app-bar-drawer"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="app-bar-drawer"]').findComponent(RouterLinkStub).text()).toBe(
      'My path',
    )
  })

  it('closes the drawer when its nav link is clicked', async () => {
    const wrapper = mountBar({ context: 'student', compact: true })
    await wrapper.get('[data-test="app-bar-menu"]').trigger('click')

    await wrapper.get('[data-test="app-bar-drawer"]').findComponent(RouterLinkStub).trigger('click')

    expect(wrapper.find('[data-test="app-bar-drawer"]').exists()).toBe(false)
  })

  it('does not render the Save button by default', () => {
    const wrapper = mountBar({ context: 'teacher' })

    expect(wrapper.find('[data-test="app-bar-save"]').exists()).toBe(false)
  })

  it('renders the Save button and calls onSave when clicked', async () => {
    const onSave = vi.fn()
    const wrapper = mountBar({ context: 'teacher', showSave: true, onSave })

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')

    expect(onSave).toHaveBeenCalled()
  })

  it('disables the Save button when saveDisabled is true', () => {
    const wrapper = mountBar({ context: 'teacher', showSave: true, saveDisabled: true })

    expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeDefined()
  })

  it('does not disable the Save button by default', () => {
    const wrapper = mountBar({ context: 'teacher', showSave: true })

    expect(wrapper.get('[data-test="app-bar-save"]').attributes('disabled')).toBeUndefined()
  })

  it('renders page-specific save actions in the bar, just before Save', () => {
    const wrapper = mount(AppBar, {
      props: { context: 'teacher', primaryNavTo: { name: 'path' }, showSave: true },
      slots: { actions: '<button data-test="page-action">Save as…</button>' },
      global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub, AccountMenu: true } },
    })

    const action = wrapper.get('[data-test="page-action"]')
    const save = wrapper.get('[data-test="app-bar-save"]')
    expect(action.element.compareDocumentPosition(save.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders page-specific save actions even when there is no plain Save', () => {
    const wrapper = mount(AppBar, {
      props: { context: 'teacher', primaryNavTo: { name: 'path' } },
      slots: { actions: '<button data-test="page-action">Save as…</button>' },
      global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub, AccountMenu: true } },
    })

    expect(wrapper.find('[data-test="page-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="app-bar-save"]').exists()).toBe(false)
  })

  it('renders a "Saved" indicator when justSaved is true', () => {
    const wrapper = mountBar({ context: 'teacher', justSaved: true })

    expect(wrapper.text()).toContain('Saved')
  })

  it('always renders the theme toggle and flips the document theme class on click', async () => {
    const wrapper = mountBar({ context: 'student' })

    const toggle = wrapper.get('[data-test="app-bar-theme-toggle"]')
    await toggle.trigger('click')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('renders the account menu', () => {
    const wrapper = mountBar({ context: 'student' })

    // AccountMenu owns the avatar/menu/sign-out behavior itself and is
    // tested in isolation — see AccountMenu.spec.ts.
    expect(wrapper.findComponent(AccountMenu).exists()).toBe(true)
  })
})
