/** A date for display, in the given BCP-47 locale, e.g. "Aug 20, 2026". */
export function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}
