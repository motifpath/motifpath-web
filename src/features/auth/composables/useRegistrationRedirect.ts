import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { readRedirectQuery } from '@/features/auth/utils/redirectQuery'
import { routeWithRedirect } from '@/features/auth/utils/routeWithRedirect'
import { useCurrentUserStore } from '@/stores/currentUser'

/**
 * Centralizes what happens next as the current user's registration state
 * changes while sitting on the registering or registration-error route:
 * `registered` advances to the preserved redirect target (default /path),
 * `failed` diverts to the registration-error route, and `idle` (registration
 * was reset — most likely a sign-out mid-flight) sends the visitor back to
 * sign-in. Used by both routes so this mapping is owned in exactly one place.
 *
 * The `?redirect=` target is forwarded on every hop (failed, idle), not just
 * on success — otherwise a deep link survives a straight-through registration
 * but is silently lost the moment it passes through a failure or sign-out.
 */
export function useRegistrationRedirect(): void {
  const route = useRoute()
  const router = useRouter()
  const currentUser = useCurrentUserStore()

  watch(
    () => currentUser.state,
    (state) => {
      const redirect = readRedirectQuery(route.query.redirect)

      if (state === 'registered') {
        void router.push(redirect ?? { name: 'path' })
      } else if (state === 'failed') {
        // Reached directly (via the guard) as well as from here on retry
        // failure — on direct entry the route is already registration-error,
        // and re-pushing the same route is a redundant no-op navigation.
        if (route.name !== 'registration-error') {
          void router.push(routeWithRedirect('registration-error', redirect))
        }
      } else if (state === 'idle') {
        void router.push(routeWithRedirect('sign-in', redirect))
      }
    },
    { immediate: true },
  )
}
