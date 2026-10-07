import { computed } from 'vue'

import type { AuthContext } from '../../src/features/auth/composables/useAuth'

/** A signed-in session with no Clerk behind it, so stories never call out. */
export function useAuth(): AuthContext {
  return {
    isLoaded: computed(() => true),
    isSignedIn: computed(() => true),
    getToken: () => Promise.resolve(null),
    refreshToken: () => Promise.resolve(null),
    openUserProfile: () => {},
    signOut: () => Promise.resolve(),
    displayInitial: computed(() => 'A'),
  }
}
