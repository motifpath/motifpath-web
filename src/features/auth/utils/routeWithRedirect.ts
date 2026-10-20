import type { RouteLocationRaw } from 'vue-router'

/** Builds a route location carrying `?redirect=` only when there's a real target to preserve. */
export function routeWithRedirect(name: string, redirect: string | undefined): RouteLocationRaw {
  return redirect ? { name, query: { redirect } } : { name }
}
