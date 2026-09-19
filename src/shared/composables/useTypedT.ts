import { useI18n } from 'vue-i18n'

import type { MessageKey } from '@/i18n'

/**
 * A `t()` bound to the app's known message keys, so a typo or a key that
 * hasn't been added to any `locales/en.json` yet is a `vue-tsc` failure
 * instead of a silent runtime fallback. `useI18n().t` alone accepts any
 * string — this wraps it with a signature that doesn't.
 */
export function useTypedT() {
  const { t: rawT, locale } = useI18n()

  function t(key: MessageKey): string
  function t(key: MessageKey, named: Record<string, unknown>): string
  function t(key: MessageKey, named?: Record<string, unknown>): string {
    return named === undefined ? rawT(key) : rawT(key, named)
  }

  return { t, locale }
}
