import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'motifpath:theme'

function systemPreference(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function persistedPreference(): Theme | null {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

function applyToDocument(value: Theme): void {
  document.documentElement.classList.toggle('dark', value === 'dark')
}

/**
 * Resolves the active theme: an explicit prior choice from `localStorage` wins;
 * otherwise falls back to the OS-level `prefers-color-scheme`. `set()` persists
 * an explicit choice and flips the `dark` class Tailwind's `darkMode: 'class'`
 * reads.
 */
export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(persistedPreference() ?? systemPreference())
  applyToDocument(theme.value)

  function set(value: Theme): void {
    theme.value = value
    window.localStorage.setItem(STORAGE_KEY, value)
    applyToDocument(value)
  }

  function toggle(): void {
    set(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, set, toggle }
})
