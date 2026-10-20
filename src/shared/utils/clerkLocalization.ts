import type { SupportedLocale } from '@/i18n'

/**
 * @clerk/localizations' own index re-exports every locale it ships (~50), so
 * importing from it directly would bundle all of them into whichever chunk
 * imports it. Each locale also has its own subpath export
 * (`@clerk/localizations/pt-BR`), so this dynamic import only pulls in the
 * one this app actually supports for the given locale.
 */
export async function loadClerkLocalization(locale: SupportedLocale) {
  return locale === 'pt-BR'
    ? (await import('@clerk/localizations/pt-BR')).ptBR
    : (await import('@clerk/localizations/en-US')).enUS
}
