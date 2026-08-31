import { beforeEach, describe, expect, it, vi } from 'vitest'

async function freshBridge() {
  vi.resetModules()
  return import('@/features/auth/authBridge')
}

describe('authBridge', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns null from getAuthToken until a getter is registered', async () => {
    const { getAuthToken } = await freshBridge()

    await expect(getAuthToken()).resolves.toBeNull()
  })

  it('routes getAuthToken through the registered getter', async () => {
    const { getAuthToken, updateAuthBridge } = await freshBridge()

    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt-1' })

    await expect(getAuthToken()).resolves.toBe('jwt-1')
  })

  it('resolves isReady only once Clerk has loaded', async () => {
    const { authChecker, updateAuthBridge } = await freshBridge()

    let ready = false
    void authChecker.isReady().then(() => {
      ready = true
    })

    updateAuthBridge({ isLoaded: false, isSignedIn: false, getToken: async () => null })
    await Promise.resolve()
    expect(ready).toBe(false)

    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })
    await authChecker.isReady()
    expect(ready).toBe(true)
  })

  it('reports the latest sign-in state', async () => {
    const { authChecker, updateAuthBridge } = await freshBridge()

    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })
    expect(authChecker.isSignedIn()).toBe(false)

    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => null })
    expect(authChecker.isSignedIn()).toBe(true)
  })
})
