import { computed, type ComputedRef } from 'vue'
import { useAuth as useClerkAuth } from '@clerk/vue'

export interface AuthContext {
  /** `true` once Clerk has resolved the session state. */
  isLoaded: ComputedRef<boolean>
  /** `true` when a user is signed in. `false` while loading or signed out. */
  isSignedIn: ComputedRef<boolean>
  /** Resolves the current session JWT, or `null` when signed out. */
  getToken: () => Promise<string | null>
  signOut: () => Promise<void>
}

/**
 * MotifPath's stable wrapper over Clerk's `useAuth`. Components and the auth
 * bridge depend on this shape, not on `@clerk/vue` directly.
 */
export function useAuth(): AuthContext {
  const clerk = useClerkAuth()

  return {
    isLoaded: computed(() => clerk.isLoaded.value === true),
    isSignedIn: computed(() => clerk.isSignedIn.value === true),
    getToken: () => clerk.getToken.value(),
    signOut: () => clerk.signOut.value(),
  }
}
