import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

export interface AuthChecker {
  /** Resolves once Clerk has settled the session state. */
  isReady: () => Promise<void>
  isSignedIn: () => boolean
}

/**
 * Navigation guard: routes marked `meta.requiresAuth` wait for Clerk to load,
 * then send signed-out visitors to the sign-in route (preserving their target
 * as `?redirect=`). Public routes pass through untouched.
 */
export function createAuthGuard(auth: AuthChecker) {
  return async (to: RouteLocationNormalized): Promise<boolean | RouteLocationRaw> => {
    if (!to.meta.requiresAuth) {
      return true
    }

    await auth.isReady()

    if (!auth.isSignedIn()) {
      return { name: 'sign-in', query: { redirect: to.fullPath } }
    }

    return true
  }
}
