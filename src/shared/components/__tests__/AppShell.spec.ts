import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const clerk = {
  isLoaded: ref(true),
  isSignedIn: ref(false),
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

const { default: AppShell } = await import('@/shared/components/AppShell.vue')

interface ShellProps {
  nav?: { to: { name: string }; label: string }[]
}

function mountShell(props: ShellProps = {}, slots = {}) {
  return mount(AppShell, {
    props,
    slots,
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

describe('AppShell', () => {
  beforeEach(() => {
    clerk.isSignedIn.value = false
    clerk.signOut.mockClear()
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

  it('renders the wordmark and no nav when none is given', () => {
    const wrapper = mountShell()

    expect(wrapper.text()).toContain('MotifPath')
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('renders nav links when given', () => {
    const wrapper = mountShell({
      nav: [
        { to: { name: 'home' }, label: 'Home' },
        { to: { name: 'path' }, label: 'My path' },
      ],
    })

    const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))
    expect(targets).toContainEqual({ name: 'home' })
    expect(targets).toContainEqual({ name: 'path' })
  })

  it('renders default slot content in main', () => {
    const wrapper = mountShell({}, { default: '<p data-test="page-content">Hello</p>' })

    expect(wrapper.get('main [data-test="page-content"]').text()).toBe('Hello')
  })

  it('renders header-actions slot content', () => {
    const wrapper = mountShell({}, { 'header-actions': '<button data-test="extra-action" /> ' })

    expect(wrapper.find('[data-test="extra-action"]').exists()).toBe(true)
  })

  it('always renders the theme toggle', () => {
    const wrapper = mountShell()

    expect(wrapper.find('[data-test="theme-toggle"]').exists()).toBe(true)
  })

  it('renders the locale switcher inline when signed out, so a visitor can change language before signing in', () => {
    const wrapper = mountShell()

    expect(wrapper.find('[data-test="locale-switcher"]').exists()).toBe(true)
  })

  it('does not render the account avatar when signed out', () => {
    const wrapper = mountShell()

    expect(wrapper.find('[data-test="app-shell-account-avatar"]').exists()).toBe(false)
  })

  describe('when signed in', () => {
    beforeEach(() => {
      clerk.isSignedIn.value = true
    })

    it('renders the account avatar instead of the inline locale switcher', () => {
      const wrapper = mountShell()

      expect(wrapper.find('[data-test="app-shell-account-avatar"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="locale-switcher"]').exists()).toBe(false)
    })

    it('opens an account menu with the locale switcher and sign out when the avatar is clicked', async () => {
      const wrapper = mountShell()

      expect(wrapper.find('[data-test="app-shell-account-menu"]').exists()).toBe(false)

      await wrapper.get('[data-test="app-shell-account-avatar"]').trigger('click')

      const menu = wrapper.get('[data-test="app-shell-account-menu"]')
      expect(menu.find('[data-test="locale-switcher"]').exists()).toBe(true)
      expect(menu.find('[data-test="sign-out"]').exists()).toBe(true)
    })

    it('signs the user out when the menu\'s Sign out item is used', async () => {
      const wrapper = mountShell()
      await wrapper.get('[data-test="app-shell-account-avatar"]').trigger('click')

      await wrapper.get('[data-test="sign-out"]').trigger('click')

      expect(clerk.signOut).toHaveBeenCalledOnce()
    })

    it('closes the account menu when its overlay is clicked', async () => {
      const wrapper = mountShell()
      await wrapper.get('[data-test="app-shell-account-avatar"]').trigger('click')

      await wrapper.get('[data-test="app-shell-account-menu-overlay"]').trigger('click')

      expect(wrapper.find('[data-test="app-shell-account-menu"]').exists()).toBe(false)
    })

    it('closes the account menu when a locale option is selected', async () => {
      const wrapper = mountShell()
      await wrapper.get('[data-test="app-shell-account-avatar"]').trigger('click')

      await wrapper.get('[data-test="locale-option-pt-BR"]').trigger('click')

      expect(wrapper.find('[data-test="app-shell-account-menu"]').exists()).toBe(false)
    })
  })
})
