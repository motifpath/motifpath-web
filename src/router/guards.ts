import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

import type { RegistrationState } from '@/features/auth/authBridge'

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

    const registration = auth.getRegistrationState()

    if (registration === 'failed') {
      return { name: 'registration-error' }
    }

    if (registration !== 'registered') {
      return { name: 'registering', query: { redirect: to.fullPath } }
    }

    return true
  }
}
