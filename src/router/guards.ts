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
 * The route a signed-in visitor's registration state belongs on, or `null`
 * if any route is fine (once `registered`, nothing forces a destination —
 * useRegistrationRedirect moves them on if they're still sitting on a
 * bridge route). `idle` and `registering` share the same destination:
 * registration either hasn't started yet or is already in flight, and
 * either way `/welcome` is where it happens.
 */
function bridgeRouteFor(registration: RegistrationState): string | null {
  if (registration === 'failed') return 'registration-error'
  if (registration === 'registered') return null
  return 'registering'
}

/**
 * Navigation guard: routes marked `meta.requiresAuth` wait for Clerk to load,
 * then send signed-out visitors to the sign-in route (preserving their target
 * as `?redirect=`; `readRedirectQuery` rejects a bridge route's own path as a
 * redirect value, so this never produces a self-referential loop even when
 * `to` is itself `/welcome` or `/welcome/error`).
 *
 * A signed-in visitor is then checked against `bridgeRouteFor` — if `to` is
 * already the route their registration state belongs on (including the two
 * bridge routes themselves matching their own state), they pass through;
 * otherwise they're redirected to the route that *does* match. This means
 * reaching `/welcome/error` directly while registration hasn't actually
 * failed (or `/welcome` while it already has) is corrected by the guard
 * itself, before any component ever mounts — not left for the view to
 * notice and correct after the fact.
 */
export function createAuthGuard(auth: AuthChecker) {
  return async (to: RouteLocationNormalized): Promise<boolean | RouteLocationRaw> => {
    if (!to.meta.requiresAuth) {
      return true
    }

    await auth.isReady()

    if (!auth.isSignedIn()) {
      return routeWithRedirect('sign-in', to.fullPath)
    }

    const bridgeRoute = bridgeRouteFor(auth.getRegistrationState())

    if (bridgeRoute !== null && to.name !== bridgeRoute) {
      return routeWithRedirect(bridgeRoute, to.fullPath)
    }

    return true
  }
}
