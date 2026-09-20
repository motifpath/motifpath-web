import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const isSignedIn = ref(false)

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ isSignedIn }),
}))

import AccountMenu from '@/shared/components/AccountMenu.vue'

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
      stubs: { RouterLink: RouterLinkStub, AccountMenu: true },
    },
  })
}

describe('AppShell', () => {
  beforeEach(() => {
    isSignedIn.value = false
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

  it('does not render the account menu when signed out', () => {
    const wrapper = mountShell()

    expect(wrapper.findComponent(AccountMenu).exists()).toBe(false)
  })

  describe('when signed in', () => {
    beforeEach(() => {
      isSignedIn.value = true
    })

    it('renders the account menu instead of the inline locale switcher', () => {
      const wrapper = mountShell()

      // AccountMenu owns the avatar/menu/sign-out/locale-switcher behavior
      // itself and is tested in isolation — see AccountMenu.spec.ts.
      expect(wrapper.findComponent(AccountMenu).exists()).toBe(true)
      expect(wrapper.find('[data-test="locale-switcher"]').exists()).toBe(false)
    })
  })
})
