// The auth/registration "bridge" routes — never meaningful redirect targets.
// Landing back on one of them (e.g. an already-registered user pushed to
// /sign-in, or a self-referential /welcome?redirect=/welcome) is a dead end,
// not a destination, so a redirect value naming one is treated as absent.
// `/welcome/error` needs no entry of its own — it's already a path-child of
// `/welcome` and matched by the prefix check below.
const BRIDGE_PATHS = ['/sign-in', '/welcome']

function isBridgePath(value: string): boolean {
  const pathname = value.split(/[?#]/, 1)[0]
  return BRIDGE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/**
 * Reads a `?redirect=` query value as a usable in-app path, or `undefined`
 * if it's absent, not a string, empty, not a relative same-origin path
 * (protects against `//host` or `https://host` values reaching `router.push`
 * as a raw target), or names one of the bridge routes themselves.
 * `route.query.redirect` is typed as `string | string[] | undefined`, and an
 * empty string is a valid but useless value that must fall back the same as
 * a missing one.
 */
export function readRedirectQuery(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  if (!value.startsWith('/') || value.startsWith('//')) return undefined
  return isBridgePath(value) ? undefined : value
}
