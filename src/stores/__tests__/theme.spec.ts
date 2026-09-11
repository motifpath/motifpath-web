import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useThemeStore } from '@/stores/theme'

const STORAGE_KEY = 'motifpath:theme'

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

describe('useThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('resolves to the persisted preference when one exists, ignoring system preference', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark')
    mockMatchMedia(false)

    const store = useThemeStore()

    expect(store.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('falls back to prefers-color-scheme when no preference is persisted', async () => {
    mockMatchMedia(true)

    const store = useThemeStore()

    expect(store.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('defaults to light when nothing is persisted and the system prefers light', async () => {
    mockMatchMedia(false)

    const store = useThemeStore()

    expect(store.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle() flips the theme, persists it, and updates the DOM class', async () => {
    mockMatchMedia(false)

    const store = useThemeStore()

    store.toggle()

    expect(store.theme).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    store.toggle()

    expect(store.theme).toBe('light')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('set() persists an explicit choice and updates the DOM class', async () => {
    mockMatchMedia(false)

    const store = useThemeStore()

    store.set('dark')

    expect(store.theme).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
