import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const clerk = {
  isLoaded: ref<boolean>(true),
  isSignedIn: ref<boolean | undefined>(true),
  getToken: vi.fn(async () => 'jwt-abc'),
  signOut: vi.fn(async () => {}),
}

vi.mock('@clerk/vue', () => ({
  useAuth: () => ({
    isLoaded: computed(() => clerk.isLoaded.value),
    isSignedIn: computed(() => clerk.isSignedIn.value),
    getToken: computed(() => clerk.getToken),
    signOut: computed(() => clerk.signOut),
  }),
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
})
