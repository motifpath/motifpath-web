// The auth/registration "bridge" routes — never meaningful redirect targets.
// Landing back on one of them (e.g. an already-registered user pushed to
// /sign-in, or a self-referential /welcome?redirect=/welcome) is a dead end,
// not a destination, so a redirect value naming one is treated as absent.
const BRIDGE_PATHS = ['/sign-in', '/welcome', '/welcome/error']

function isBridgePath(value: string): boolean {
  return BRIDGE_PATHS.some((path) => value === path || value.startsWith(`${path}/`))
}

/**
 * Reads a `?redirect=` query value as a usable path, or `undefined` if it's
 * absent, not a string, empty, or names one of the bridge routes themselves.
 * `route.query.redirect` is typed as `string | string[] | undefined`, and an
 * empty string is a valid but useless value that must fall back the same as
 * a missing one.
 */
export function readRedirectQuery(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return isBridgePath(value) ? undefined : value
}
