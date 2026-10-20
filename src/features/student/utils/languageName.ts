/**
 * A language's name in the interface language ("inglês" for `en` in pt-BR), so "Watch in …" reads
 * naturally either way. The regional variant is dropped: "Portuguese", not "Brazilian
 * Portuguese". Falls back to `fallback` (the API's own name), then to the code.
 */
export function languageName(code: string, uiLocale: string, fallback?: string): string {
  const base = code.split('-')[0]
  try {
    const name = new Intl.DisplayNames([uiLocale], { type: 'language', fallback: 'none' }).of(base)
    if (name) return name
  } catch {
    // An invalid code: use the fallback below.
  }
  return fallback ?? code
}
