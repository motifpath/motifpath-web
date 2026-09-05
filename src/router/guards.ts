import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

import type { RegistrationState } from '@/features/auth/authBridge'
import { routeWithRedirect } from '@/features/auth/utils/routeWithRedirect'

export interface AuthChecker {
  /** Resolves once Clerk has settled the session state. */
  isReady: () => Promise<void>
  isSignedIn: () => boolean
  /** Current registration state of the signed-in identity's MotifPath profile. */
  getRegistrationState: () => RegistrationState
}

/**
 * Navigation guard: routes marked `meta.requiresAuth` wait for Clerk to load,
 * then send signed-out visitors to the sign-in route (preserving their target
 * as `?redirect=`). A signed-in visitor whose registration has not yet reached
 * `registered` is sent to the registering route (also preserving `?redirect=`),
 * or to the registration-error route if it failed. Public routes pass through
 * untouched.
 *
 * Routes also marked `meta.skipRegistrationGate` (the registering and
 * registration-error routes themselves) still require a signed-in session,
 * but skip the registration-state branch above — otherwise a signed-in
 * visitor whose registration isn't yet 'registered' would be redirected
 * from /welcome back to /welcome, looping forever.
 *
 * An unauthenticated visit to one of those same skip-gate routes never
 * preserves its own path as the sign-in `?redirect=` — they're bridge
 * routes, not real destinations, and a self-referential redirect (sign in
 * → bounced right back to /welcome?redirect=/welcome) would strand the
 * visitor once registered, since navigating to the same route with only
 * the query changed doesn't remount the component that would act on it.
 */
export function createAuthGuard(auth: AuthChecker) {
  return async (to: RouteLocationNormalized): Promise<boolean | RouteLocationRaw> => {
    if (!to.meta.requiresAuth) {
      return true
    }

    await auth.isReady()

    if (!auth.isSignedIn()) {
      return routeWithRedirect('sign-in', to.meta.skipRegistrationGate ? undefined : to.fullPath)
    }

    if (to.meta.skipRegistrationGate) {
      return true
    }

    const registration = auth.getRegistrationState()

    if (registration === 'failed') {
      return routeWithRedirect('registration-error', to.fullPath)
    }

    if (registration !== 'registered') {
      return routeWithRedirect('registering', to.fullPath)
    }

    return true
  }
}
