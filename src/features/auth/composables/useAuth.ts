import { computed, type ComputedRef } from 'vue'
import { useAuth as useClerkAuth, useClerk, useUser as useClerkUser } from '@clerk/vue'

export interface AuthContext {
  /** `true` once Clerk has resolved the session state. */
  isLoaded: ComputedRef<boolean>
  /** `true` when a user is signed in. `false` while loading or signed out. */
  isSignedIn: ComputedRef<boolean>
  /** Resolves the current session JWT, or `null` when signed out. */
  getToken: () => Promise<string | null>
  /**
   * Mints a new session JWT instead of reusing Clerk's cached one — for right
   * after the user changed something the token carries (like their name),
   * which a cached token would not reflect yet. Later `getToken()` calls
   * return the new token.
   */
  refreshToken: () => Promise<string | null>
  /** Opens Clerk's own profile screen, where users edit their name. */
  openUserProfile: () => void
  signOut: () => Promise<void>
  /** Single uppercase letter for an avatar badge — first name, else email, else "?". */
  displayInitial: ComputedRef<string>
}

/**
 * MotifPath's stable wrapper over Clerk's `useAuth`. Components and the auth
 * bridge depend on this shape, not on `@clerk/vue` directly.
 */
export function useAuth(): AuthContext {
  const clerk = useClerkAuth()
  const clerkUser = useClerkUser()
  const clerkInstance = useClerk()

  return {
    isLoaded: computed(() => clerk.isLoaded.value === true),
    isSignedIn: computed(() => clerk.isSignedIn.value === true),
    getToken: () => clerk.getToken.value(),
    refreshToken: () => clerk.getToken.value({ skipCache: true }),
    openUserProfile: () => clerkInstance.value?.openUserProfile(),
    signOut: () => clerk.signOut.value(),
    displayInitial: computed(() => {
      const user = clerkUser.user.value
      const source = user?.firstName || user?.primaryEmailAddress?.emailAddress
      return source ? source.charAt(0).toUpperCase() : '?'
    }),
  }
}
