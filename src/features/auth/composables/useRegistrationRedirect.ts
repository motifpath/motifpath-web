import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { readRedirectQuery } from '@/features/auth/utils/redirectQuery'
import { useCurrentUserStore } from '@/stores/currentUser'

/**
 * Centralizes what happens next as the current user's registration state
 * changes while sitting on the registering or registration-error route:
 * `registered` advances to the preserved redirect target (default /path),
 * `failed` diverts to the registration-error route, and `idle` (registration
 * was reset — most likely a sign-out mid-flight) sends the visitor back to
 * sign-in. Used by both routes so this mapping is owned in exactly one place.
 */
export function useRegistrationRedirect(): void {
  const route = useRoute()
  const router = useRouter()
  const currentUser = useCurrentUserStore()

  watch(
    () => currentUser.state,
    (state) => {
      if (state === 'registered') {
        const redirect = readRedirectQuery(route.query.redirect)
        void router.push(redirect ?? { name: 'path' })
      } else if (state === 'failed') {
        void router.push({ name: 'registration-error' })
      } else if (state === 'idle') {
        void router.push({ name: 'sign-in' })
      }
    },
    { immediate: true },
  )
}
