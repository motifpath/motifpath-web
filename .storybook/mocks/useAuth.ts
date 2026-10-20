import { computed } from 'vue'

import type { AuthContext } from '../../src/features/auth/composables/useAuth'

/** A signed-in session with no Clerk behind it, so stories never call out. */
export function useAuth(): AuthContext {
  return {
    isLoaded: computed(() => true),
    isSignedIn: computed(() => true),
    getToken: () => Promise.resolve(null),
    refreshToken: () => Promise.resolve(null),
    signOut: () => Promise.resolve(),
    displayInitial: computed(() => 'A'),
    email: computed(() => 'ana.souza@example.com'),
    startGoogleSignIn: () => Promise.resolve(),
    pendingSignUp: computed(() => null),
    completeSignUpName: () => Promise.resolve(),
    accountName: computed(() => ({ firstName: 'Ana', lastName: 'Souza' })),
    updateAccountName: () => Promise.resolve(),
  }
}
