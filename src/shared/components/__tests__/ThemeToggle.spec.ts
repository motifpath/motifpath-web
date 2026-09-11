import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'

import ThemeToggle from '@/shared/components/ThemeToggle.vue'

function mockMatchMedia(prefersDark: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' && prefersDark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockMatchMedia(false)
  })

  it('renders a button reflecting the current (light) theme', () => {
    const wrapper = mount(ThemeToggle)

    const button = wrapper.get('[data-test="theme-toggle"]')
    expect(button.attributes('aria-pressed')).toBe('false')
  })

  it('toggles the theme, the DOM class, and its own pressed state on click', async () => {
    const wrapper = mount(ThemeToggle)

    await wrapper.get('[data-test="theme-toggle"]').trigger('click')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(wrapper.get('[data-test="theme-toggle"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-test="theme-toggle"]').trigger('click')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(wrapper.get('[data-test="theme-toggle"]').attributes('aria-pressed')).toBe('false')
  })
})
