import { useI18n } from 'vue-i18n'

import type { MessageKey } from '@/i18n'
import { useScopedLocale, type LocaleOverride } from '@/shared/composables/useScopedLocale'

/**
 * A `t()` bound to the app's known message keys, so a typo or a key that
 * hasn't been added to any `locales/en.json` yet is a `vue-tsc` failure
 * instead of a silent runtime fallback. `useI18n().t` alone accepts any
 * string — this wraps it with a signature that doesn't.
 *
 * Inside a `LocaleScope` (or given `override.locale`) it translates in that
 * locale instead of the UI locale.
 */
export function useTypedT(override: LocaleOverride = {}) {
  const { t: rawT, locale } = useI18n()
  const scopedLocale = useScopedLocale(override)

  function t(key: MessageKey): string
  function t(key: MessageKey, named: Record<string, unknown>): string
  function t(key: MessageKey, named?: Record<string, unknown>): string {
    return rawT(key, named ?? {}, { locale: scopedLocale.value })
  }

  return { t, locale }
}
