import type { components } from '@/api/generated/core-domain'

type LocalizedNames = components['schemas']['LocalizedNames']

/**
 * The name to show from a per-language names map: the one in `languageCode`
 * (an API Language.code, e.g. "pt_BR"), else the English one, else the one in
 * the alphabetically first language — so a label is never blank while any
 * name exists.
 */
export function pickLocalizedName(names: LocalizedNames, languageCode: string): string {
  const preferred = names[languageCode] ?? names.en
  if (preferred !== undefined) return preferred
  const [first] = Object.keys(names).sort()
  return first === undefined ? '' : (names[first] ?? '')
}
