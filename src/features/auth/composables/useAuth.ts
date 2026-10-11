import { computed, type ComputedRef } from 'vue'
import { useAuth as useClerkAuth, useSignIn, useSignUp, useUser as useClerkUser } from '@clerk/vue'

import { useToast } from '@/shared/composables/useToast'
import { i18n } from '@/i18n'

/** A first and last name; a missing one is the empty string. */
export interface PersonName {
  firstName: string
  lastName: string
}

/** Where Google sign-in returns to: Clerk's callback, then the page after it. */
export interface GoogleSignInUrls {
  callbackUrl: string
  completeUrl: string
}

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
  /** Signs out, then tells the visitor their practice and progress are saved. */
  signOut: () => Promise<void>
  /**
   * Leaves for Google's own sign-in — no sign-in form of ours or Clerk's first. Rejects when Clerk
   * has not loaded yet.
   */
  startGoogleSignIn: (urls: GoogleSignInUrls) => Promise<void>
  /**
   * The name Google gave a sign-up that cannot finish without a full name, or null when no sign-up
   * is waiting for one.
   */
  pendingSignUp: ComputedRef<PersonName | null>
  /** Gives the waiting sign-up its name and starts the new account's session. */
  completeSignUpName: (firstName: string, lastName: string) => Promise<void>
  /** The signed-in account's name. */
  accountName: ComputedRef<PersonName>
  /**
   * Renames the signed-in account and mints a token that carries the new name, so the next request
   * already sends it.
   */
  updateAccountName: (firstName: string, lastName: string) => Promise<void>
  /** Single uppercase letter for an avatar badge — first name, else email, else "?". */
  displayInitial: ComputedRef<string>
  /** The account's primary email address, or an empty string when it has none. */
  email: ComputedRef<string>
}

/**
 * MotifPath's stable wrapper over Clerk's `useAuth`. Components and the auth
 * bridge depend on this shape, not on `@clerk/vue` directly.
 */
export function useAuth(): AuthContext {
  const clerk = useClerkAuth()
  const clerkUser = useClerkUser()
  const { signIn } = useSignIn()
  const { signUp, setActive } = useSignUp()
  const toast = useToast()

  return {
    isLoaded: computed(() => clerk.isLoaded.value === true),
    isSignedIn: computed(() => clerk.isSignedIn.value === true),
    getToken: () => clerk.getToken.value(),
    refreshToken: () => clerk.getToken.value({ skipCache: true }),
    signOut: async () => {
      await clerk.signOut.value()
      toast.neutral(i18n.global.t('signedOutToast'))
    },
    startGoogleSignIn: async ({ callbackUrl, completeUrl }) => {
      const attempt = signIn.value
      if (!attempt) throw new Error('Clerk has not loaded yet')
      await attempt.authenticateWithRedirect({ strategy: 'oauth_google', redirectUrl: callbackUrl, redirectUrlComplete: completeUrl })
    },
    pendingSignUp: computed(() => {
      const attempt = signUp.value
      if (attempt?.status !== 'missing_requirements') return null
      return { firstName: attempt.firstName ?? '', lastName: attempt.lastName ?? '' }
    }),
    completeSignUpName: async (firstName, lastName) => {
      const attempt = signUp.value
      if (!attempt) throw new Error('no sign-up is waiting for a name')
      const updated = await attempt.update({ firstName, lastName })
      if (updated.status !== 'complete' || !updated.createdSessionId) {
        throw new Error(`the sign-up is still ${updated.status ?? 'incomplete'}`)
      }
      await setActive.value?.({ session: updated.createdSessionId })
    },
    accountName: computed(() => ({
      firstName: clerkUser.user.value?.firstName ?? '',
      lastName: clerkUser.user.value?.lastName ?? '',
    })),
    updateAccountName: async (firstName, lastName) => {
      const user = clerkUser.user.value
      if (!user) throw new Error('no account is signed in')
      await user.update({ firstName, lastName })
      await clerk.getToken.value({ skipCache: true })
    },
    displayInitial: computed(() => {
      const user = clerkUser.user.value
      const source = user?.firstName || user?.primaryEmailAddress?.emailAddress
      return source ? source.charAt(0).toUpperCase() : '?'
    }),
    email: computed(() => clerkUser.user.value?.primaryEmailAddress?.emailAddress ?? ''),
  }
}
