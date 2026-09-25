import { i18n, toApiLanguageCode } from '@/i18n'
import { pickLocalizedName } from '@/shared/utils/localizedName'
import type { components } from '@/api/generated/core-domain'

type LocalizedNames = components['schemas']['LocalizedNames']

/**
 * Resolves per-language names (instruments, and later diagrams) for the
 * current UI locale. Reads the locale on every call, so a template using it
 * re-renders when the locale changes.
 */
export function useLocalizedName() {
  function localizedName(names: LocalizedNames): string {
    return pickLocalizedName(names, toApiLanguageCode(i18n.global.locale.value))
  }

  return { localizedName }
}
