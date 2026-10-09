import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useThemeStore } from '@/stores/theme'
import { mockViewport } from '@/shared/testUtils/viewport'

const STORAGE_KEY = 'motifpath:theme'

function isDarkOnPage(): boolean {
  return document.documentElement.classList.contains('dark')
}

describe('useThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('follows the device (Auto) when nothing was chosen', () => {
    mockViewport(1280, { prefersDark: true })

    const store = useThemeStore()

    expect(store.preference).toBe('system')
    expect(store.theme).toBe('dark')
    expect(isDarkOnPage()).toBe(true)
  })

  it('keeps following the device while on Auto, when the device switches', () => {
    const device = mockViewport(1280, { prefersDark: false })
    const store = useThemeStore()
    expect(store.theme).toBe('light')

    device.setPrefersDark(true)

    expect(store.theme).toBe('dark')
    expect(isDarkOnPage()).toBe(true)
  })

  it('an explicit choice wins over the device, and is remembered', () => {
    const device = mockViewport(1280, { prefersDark: false })
    const store = useThemeStore()

    store.setPreference('dark')
    device.setPrefersDark(false)

    expect(store.theme).toBe('dark')
    expect(isDarkOnPage()).toBe(true)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('restores a remembered choice, ignoring the device', () => {
    window.localStorage.setItem(STORAGE_KEY, 'light')
    mockViewport(1280, { prefersDark: true })

    const store = useThemeStore()

    expect(store.preference).toBe('light')
    expect(store.theme).toBe('light')
    expect(isDarkOnPage()).toBe(false)
  })

  it('going back to Auto forgets the choice and follows the device again', () => {
    window.localStorage.setItem(STORAGE_KEY, 'light')
    mockViewport(1280, { prefersDark: true })
    const store = useThemeStore()

    store.setPreference('system')

    expect(store.theme).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('system')
  })

  it('treats an unknown remembered value as Auto', () => {
    window.localStorage.setItem(STORAGE_KEY, 'sepia')
    mockViewport(1280, { prefersDark: false })

    expect(useThemeStore().preference).toBe('system')
  })
})
