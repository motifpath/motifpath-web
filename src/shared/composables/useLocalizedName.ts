import { toApiLanguageCode } from '@/i18n'
import { useScopedLocale, type LocaleOverride } from '@/shared/composables/useScopedLocale'
import { pickLocalizedName } from '@/shared/utils/localizedName'
import type { components } from '@/api/generated/core-domain'

type LocalizedNames = components['schemas']['LocalizedNames']

/**
 * Resolves per-language names (instruments, diagrams) for the current UI
 * locale, or a `LocaleScope`'s. Reads the locale on every call, so a template
 * using it re-renders when the locale changes.
 */
export function useLocalizedName(override: LocaleOverride = {}) {
  const locale = useScopedLocale(override)

  function localizedName(names: LocalizedNames): string {
    return pickLocalizedName(names, toApiLanguageCode(locale.value))
  }

  return { localizedName }
}
