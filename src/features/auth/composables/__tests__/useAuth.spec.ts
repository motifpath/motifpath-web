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
  primaryEmailAddress: { emailAddress: string } | null
}

const clerkUser = ref<ClerkUserStub | null | undefined>(undefined)

const clerkInstance = {
  openUserProfile: vi.fn(),
}

vi.mock('@clerk/vue', () => ({
  useAuth: () => ({
    isLoaded: computed(() => clerk.isLoaded.value),
    isSignedIn: computed(() => clerk.isSignedIn.value),
    getToken: computed(() => clerk.getToken),
    signOut: computed(() => clerk.signOut),
  }),
  useUser: () => ({
    user: computed(() => clerkUser.value),
  }),
  useClerk: () => computed(() => clerkInstance),
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

  it('delegates sign-out to Clerk', async () => {
    await useAuth().signOut()

    expect(clerk.signOut).toHaveBeenCalled()
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

  it("opens Clerk's own profile screen, where users edit their name", () => {
    useAuth().openUserProfile()

    expect(clerkInstance.openUserProfile).toHaveBeenCalledOnce()
  })
})
