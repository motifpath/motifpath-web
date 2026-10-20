import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark'
/** What the person chose: follow the device (`system`, the default), or always light or dark. */
export type ThemePreference = 'system' | Theme

const STORAGE_KEY = 'motifpath:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function persistedPreference(): ThemePreference {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function applyToDocument(value: Theme): void {
  document.documentElement.classList.toggle('dark', value === 'dark')
}

/**
 * The active theme. The person's preference is remembered on this device; on `system` (Auto)
 * the theme follows the device's `prefers-color-scheme`, live, so switching the phone to dark
 * mode switches the app too. The resolved `theme` flips the `dark` class Tailwind's
 * `darkMode: 'class'` reads.
 */
export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemePreference>(persistedPreference())

  const deviceQuery = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
  const deviceDark = ref(deviceQuery?.matches ?? false)
  deviceQuery?.addEventListener('change', (event) => {
    deviceDark.value = event.matches
    applyToDocument(theme.value)
  })

  const theme = computed<Theme>(() =>
    preference.value === 'system' ? (deviceDark.value ? 'dark' : 'light') : preference.value,
  )
  applyToDocument(theme.value)

  function setPreference(value: ThemePreference): void {
    preference.value = value
    window.localStorage.setItem(STORAGE_KEY, value)
    applyToDocument(theme.value)
  }

  return { preference, theme, setPreference }
})
