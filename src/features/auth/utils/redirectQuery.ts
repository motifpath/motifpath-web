/**
 * Reads a `?redirect=` query value as a usable path, or `undefined` if it's
 * absent, not a string, or empty. `route.query.redirect` is typed as
 * `string | string[] | undefined`, and an empty string is a valid but
 * useless value that must fall back the same as a missing one.
 */
export function readRedirectQuery(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
