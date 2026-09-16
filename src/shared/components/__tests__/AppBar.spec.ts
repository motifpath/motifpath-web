import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { computed, ref } from 'vue'

const clerk = {
  isLoaded: ref(true),
  isSignedIn: ref(true),
  getToken: vi.fn(async () => 'jwt-abc'),
  signOut: vi.fn(async () => {}),
}
const clerkUser = ref<{ firstName: string | null; primaryEmailAddress: null } | null>({
  firstName: 'Gilson',
  primaryEmailAddress: null,
})

vi.mock('@clerk/vue', () => ({
  useAuth: () => ({
    isLoaded: computed(() => clerk.isLoaded.value),
    isSignedIn: computed(() => clerk.isSignedIn.value),
    getToken: computed(() => clerk.getToken),
    signOut: computed(() => clerk.signOut),
  }),
  useUser: () => ({ user: computed(() => clerkUser.value) }),
}))

beforeEach(() => {
  clerk.signOut.mockClear()
})

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

function mountBar(props: Props) {
  return mount(AppBar, {
    props: { primaryNavTo: { name: 'path' }, ...props },
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

describe('AppBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockMatchMedia()
    clerkUser.value = { firstName: 'Gilson', primaryEmailAddress: null }
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

  it("shows a 'My path' link for student context", () => {
    const wrapper = mountBar({ context: 'student', primaryNavTo: { name: 'path' } })

    const link = wrapper.findComponent(RouterLinkStub)
    expect(link.text()).toBe('My path')
    expect(link.props('to')).toEqual({ name: 'path' })
  })

  it("shows an 'Exercises' link for teacher context with no breadcrumb", () => {
    const wrapper = mountBar({ context: 'teacher', primaryNavTo: { name: 'teacher-exercises' } })

    const links = wrapper.findAllComponents(RouterLinkStub)
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

  it('hides the hamburger and shows inline nav when not compact', () => {
    const wrapper = mountBar({ context: 'student' })

    expect(wrapper.find('[data-test="app-bar-menu"]').exists()).toBe(false)
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(true)
  })

  it('shows the hamburger and hides inline nav when compact', () => {
    const wrapper = mountBar({ context: 'student', compact: true })

    expect(wrapper.find('[data-test="app-bar-menu"]').exists()).toBe(true)
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
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

  it("renders the signed-in user's display initial in the avatar", () => {
    clerkUser.value = { firstName: 'Ana', primaryEmailAddress: null }

    const wrapper = mountBar({ context: 'student' })

    expect(wrapper.get('[data-test="app-bar-avatar"]').text()).toBe('A')
  })

  it('opens a menu with a single Sign out item when the avatar is clicked', async () => {
    const wrapper = mountBar({ context: 'student' })

    expect(wrapper.find('[data-test="app-bar-account-menu"]').exists()).toBe(false)

    await wrapper.get('[data-test="app-bar-avatar"]').trigger('click')

    const menu = wrapper.get('[data-test="app-bar-account-menu"]')
    expect(menu.findAll('[data-test="sign-out"]')).toHaveLength(1)
  })

  it('signs the user out when the menu\'s Sign out item is used', async () => {
    const wrapper = mountBar({ context: 'student' })
    await wrapper.get('[data-test="app-bar-avatar"]').trigger('click')

    await wrapper.get('[data-test="sign-out"]').trigger('click')

    expect(clerk.signOut).toHaveBeenCalledOnce()
  })

  it('closes the account menu when its overlay is clicked', async () => {
    const wrapper = mountBar({ context: 'student' })
    await wrapper.get('[data-test="app-bar-avatar"]').trigger('click')

    await wrapper.get('[data-test="app-bar-account-menu-overlay"]').trigger('click')

    expect(wrapper.find('[data-test="app-bar-account-menu"]').exists()).toBe(false)
  })
})
