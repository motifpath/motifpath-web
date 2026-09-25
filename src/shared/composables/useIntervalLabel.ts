import { i18n } from '@/i18n'
import { useScopedLocale, type LocaleOverride } from '@/shared/composables/useScopedLocale'
import { intervalLabelKey } from '@/shared/utils/intervalLabels'

/**
 * Displays an interval code in the current UI language, or a `LocaleScope`'s.
 * A value that isn't a canonical code (e.g. an empty interval while a position
 * has no root yet) is shown as it is. Uses the global i18n instance, so it
 * works outside a component's setup and re-renders on a locale switch like any
 * template text.
 */
export function useIntervalLabel(override: LocaleOverride = {}) {
  const locale = useScopedLocale(override)

  function intervalLabel(code: string): string {
    const key = intervalLabelKey(code)
    return key === null ? code : i18n.global.t(key, {}, { locale: locale.value })
  }

  return { intervalLabel }
}
