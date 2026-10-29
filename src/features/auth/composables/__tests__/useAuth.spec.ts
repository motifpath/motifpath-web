import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const clerk = {
  isLoaded: ref<boolean>(true),
  isSignedIn: ref<boolean | undefined>(true),
  getToken: vi.fn(async () => 'jwt-abc'),
  signOut: vi.fn(async () => {}),
}

interface ClerkUserStub {
  firstName: string | null
  lastName?: string | null
  primaryEmailAddress: { emailAddress: string } | null
  update?: (params: { firstName: string; lastName: string }) => Promise<unknown>
}

interface SignUpStub {
  status: string | null
  firstName: string | null
  lastName: string | null
  createdSessionId: string | null
  update: (params: { firstName: string; lastName: string }) => Promise<SignUpStub>
}

const clerkUser = ref<ClerkUserStub | null | undefined>(undefined)

const authenticateWithRedirect = vi.fn<(params: Record<string, string>) => Promise<void>>(async () => {})
const signIn = ref<{ authenticateWithRedirect: typeof authenticateWithRedirect } | undefined>({ authenticateWithRedirect })
const signUp = ref<SignUpStub | undefined>(undefined)
const setActive = vi.fn<(params: { session: string | null }) => Promise<void>>(async () => {})

interface GoogleTokenAttemptStub {
  status: string | null
  createdSessionId: string | null
}

const authenticateWithGoogleOneTap = vi.fn<(params: { token: string }) => Promise<GoogleTokenAttemptStub>>()
const clerkInstance = ref<{
  authenticateWithGoogleOneTap: typeof authenticateWithGoogleOneTap
  setActive: typeof setActive
} | null>({ authenticateWithGoogleOneTap, setActive })

const forgetAppShellClientToken = vi.fn(async () => {})
vi.mock('@/features/auth/appShellClerk', () => ({ forgetAppShellClientToken }))

const toastNeutral = vi.fn()
vi.mock('@/shared/composables/useToast', () => ({ useToast: () => ({ neutral: toastNeutral }) }))

vi.mock('@clerk/vue', () => ({
  useAuth: () => ({
    isLoaded: computed(() => clerk.isLoaded.value),
    isSignedIn: computed(() => clerk.isSignedIn.value),
    getToken: computed(() => clerk.getToken),
    signOut: computed(() => clerk.signOut),
  }),
  useClerk: () => computed(() => clerkInstance.value),
  useUser: () => ({
    user: computed(() => clerkUser.value),
  }),
  useSignIn: () => ({ signIn: computed(() => signIn.value), setActive: computed(() => setActive) }),
  useSignUp: () => ({ signUp: computed(() => signUp.value), setActive: computed(() => setActive) }),
}))

const { useAuth } = await import('@/features/auth/composables/useAuth')

describe('useAuth', () => {
  it('reflects Clerk load and sign-in state', () => {
    clerk.isLoaded.value = true
    clerk.isSignedIn.value = true

    const { isLoaded, isSignedIn } = useAuth()

    expect(isLoaded.value).toBe(true)
    expect(isSignedIn.value).toBe(true)
  })

  it('treats an undefined sign-in state as signed out', () => {
    clerk.isSignedIn.value = undefined

    expect(useAuth().isSignedIn.value).toBe(false)
  })

  it('resolves a token through Clerk getToken', async () => {
    await expect(useAuth().getToken()).resolves.toBe('jwt-abc')
  })

  it('delegates sign-out to Clerk, then says progress is saved', async () => {
    toastNeutral.mockClear()

    await useAuth().signOut()

    expect(clerk.signOut).toHaveBeenCalled()
    expect(toastNeutral).toHaveBeenCalledWith("You're signed out. Your practice and progress are saved.")
  })

  it('forgets the sign-in kept on the phone after signing out', async () => {
    const order: string[] = []
    clerk.signOut.mockImplementationOnce(async () => void order.push('signOut'))
    forgetAppShellClientToken.mockImplementationOnce(async () => void order.push('forget'))

    await useAuth().signOut()

    expect(order).toEqual(['signOut', 'forget'])
  })

  it("resolves the display initial from the user's first name", () => {
    clerkUser.value = { firstName: 'Gilson', primaryEmailAddress: { emailAddress: 'g@x.com' } }

    expect(useAuth().displayInitial.value).toBe('G')
  })

  it('falls back to the primary email address when there is no first name', () => {
    clerkUser.value = { firstName: null, primaryEmailAddress: { emailAddress: 'ana@x.com' } }

    expect(useAuth().displayInitial.value).toBe('A')
  })

  it('falls back to "?" when no user data is available yet', () => {
    clerkUser.value = null

    expect(useAuth().displayInitial.value).toBe('?')
  })

  it('forces Clerk to mint a fresh token instead of reusing its cached one', async () => {
    clerk.getToken.mockClear()

    const token = await useAuth().refreshToken()

    expect(clerk.getToken).toHaveBeenCalledWith({ skipCache: true })
    expect(token).toBe('jwt-abc')
  })


  describe('Google sign-in', () => {
    it('sends the visitor straight to Google, through the callback, to the page after it', async () => {
      authenticateWithRedirect.mockClear()

      await useAuth().startGoogleSignIn({ callbackUrl: '/sso-callback?redirect=%2Fprogress', completeUrl: '/welcome?redirect=%2Fprogress' })

      expect(authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback?redirect=%2Fprogress',
        redirectUrlComplete: '/welcome?redirect=%2Fprogress',
      })
    })

    it('refuses before Clerk has loaded, so the button can say so', async () => {
      signIn.value = undefined

      await expect(useAuth().startGoogleSignIn({ callbackUrl: '/sso-callback', completeUrl: '/welcome' })).rejects.toThrow()
      signIn.value = { authenticateWithRedirect }
    })
  })

  describe("Google sign-in with the phone's account picker", () => {
    it('hands the Google ID token to Clerk and starts the session it signed in', async () => {
      setActive.mockClear()
      authenticateWithGoogleOneTap.mockResolvedValueOnce({ status: 'complete', createdSessionId: 'sess_1' })

      const outcome = await useAuth().signInWithGoogleToken('google-id-token')

      expect(authenticateWithGoogleOneTap).toHaveBeenCalledWith({ token: 'google-id-token' })
      expect(setActive).toHaveBeenCalledWith({ session: 'sess_1' })
      expect(outcome).toBe('signed-in')
    })

    it('reports a sign-up still waiting for a full name, without starting a session', async () => {
      setActive.mockClear()
      authenticateWithGoogleOneTap.mockResolvedValueOnce({ status: 'missing_requirements', createdSessionId: null })

      await expect(useAuth().signInWithGoogleToken('google-id-token')).resolves.toBe('needs-name')
      expect(setActive).not.toHaveBeenCalled()
    })

    it('fails when Clerk neither signs in nor waits for a name', async () => {
      setActive.mockClear()
      authenticateWithGoogleOneTap.mockResolvedValueOnce({ status: 'needs_second_factor', createdSessionId: null })

      await expect(useAuth().signInWithGoogleToken('google-id-token')).rejects.toThrow('needs_second_factor')
      expect(setActive).not.toHaveBeenCalled()
    })

    it('fails when Clerk refuses the token', async () => {
      authenticateWithGoogleOneTap.mockRejectedValueOnce(new Error('authorization_invalid'))

      await expect(useAuth().signInWithGoogleToken('google-id-token')).rejects.toThrow('authorization_invalid')
    })

    it('refuses before Clerk has loaded', async () => {
      const loaded = clerkInstance.value
      clerkInstance.value = null

      await expect(useAuth().signInWithGoogleToken('google-id-token')).rejects.toThrow()
      clerkInstance.value = loaded
    })
  })

  describe('the name a sign-up is missing', () => {
    function signUpMissingName(update: SignUpStub['update']): SignUpStub {
      return { status: 'missing_requirements', firstName: 'Dora', lastName: null, createdSessionId: null, update }
    }

    it('is what Google gave, while the sign-up waits for a name', () => {
      signUp.value = signUpMissingName(vi.fn())

      expect(useAuth().pendingSignUp.value).toEqual({ firstName: 'Dora', lastName: '' })
    })

    it('is nothing when no sign-up is waiting', () => {
      signUp.value = { status: 'complete', firstName: 'Dora', lastName: 'Silva', createdSessionId: 'sess_1', update: vi.fn() }

      expect(useAuth().pendingSignUp.value).toBeNull()
    })

    it('completes the sign-up with the name, then starts its session', async () => {
      setActive.mockClear()
      const update = vi.fn(async (params: { firstName: string; lastName: string }) => ({
        status: 'complete', firstName: params.firstName, lastName: params.lastName, createdSessionId: 'sess_new', update,
      }))
      signUp.value = signUpMissingName(update)

      await useAuth().completeSignUpName('Dora', 'Silva')

      expect(update).toHaveBeenCalledWith({ firstName: 'Dora', lastName: 'Silva' })
      expect(setActive).toHaveBeenCalledWith({ session: 'sess_new' })
    })

    it('fails when the sign-up still is not complete, without starting a session', async () => {
      setActive.mockClear()
      const update = vi.fn(async () => signUpMissingName(update))
      signUp.value = signUpMissingName(update)

      await expect(useAuth().completeSignUpName('Dora', 'Silva')).rejects.toThrow()
      expect(setActive).not.toHaveBeenCalled()
    })
  })

  describe("an existing account's name", () => {
    it("is the account's first and last name", () => {
      clerkUser.value = { firstName: 'Edu', lastName: null, primaryEmailAddress: null }

      expect(useAuth().accountName.value).toEqual({ firstName: 'Edu', lastName: '' })
    })

    it('is updated on the account, then a fresh token carries it', async () => {
      const calls: string[] = []
      const update = vi.fn(async () => {
        calls.push('update')
      })
      clerkUser.value = { firstName: 'Edu', lastName: null, primaryEmailAddress: null, update }
      clerk.getToken.mockImplementationOnce(async () => {
        calls.push('token')
        return 'jwt-new'
      })

      await useAuth().updateAccountName('Edu', 'Souza')

      expect(update).toHaveBeenCalledWith({ firstName: 'Edu', lastName: 'Souza' })
      expect(clerk.getToken).toHaveBeenLastCalledWith({ skipCache: true })
      expect(calls).toEqual(['update', 'token'])
    })
  })
})
