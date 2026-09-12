import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppShell from '@/shared/components/AppShell.vue'

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
    const wrapper = mountShell({}, { 'header-actions': '<button data-test="sign-out" /> ' })

    expect(wrapper.find('[data-test="sign-out"]').exists()).toBe(true)
  })

  it('always renders the theme toggle', () => {
    const wrapper = mountShell()

    expect(wrapper.find('[data-test="theme-toggle"]').exists()).toBe(true)
  })
})
