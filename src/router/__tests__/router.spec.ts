import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/vue', () => ({
  SignIn: { name: 'SignIn', template: '<div />' },
  useAuth: () => ({
    isLoaded: { value: true },
    isSignedIn: { value: false },
    getToken: { value: async () => null },
    signOut: { value: async () => {} },
  }),
}))

import { router } from '@/router'
import { updateAuthBridge, updateRegistrationBridge } from '@/features/auth/authBridge'

describe('router', () => {
  beforeEach(async () => {
    await router.replace('/')
    await router.isReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends an unauthenticated visitor from a protected route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/path')

    expect(router.currentRoute.value.name).toBe('sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/path')
  })

  it('lets a registered visitor reach a protected route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')

    await router.push('/path')

    expect(router.currentRoute.value.name).toBe('path')
  })

  it('sends a signed-in visitor whose registration has not settled to the registering route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registering')

    await router.push('/path')

    expect(router.currentRoute.value.name).toBe('registering')
    expect(router.currentRoute.value.query.redirect).toBe('/path')
  })

  it('sends a signed-in visitor whose registration failed to the registration-error route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('failed')

    await router.push('/path')

    expect(router.currentRoute.value.name).toBe('registration-error')
    expect(router.currentRoute.value.query.redirect).toBe('/path')
  })

  it('sends an unauthenticated visitor away from the registering route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/welcome')

    // The guard preserves ?redirect= the same as for any other protected
    // route — the self-referential-loop defense lives downstream, in
    // readRedirectQuery rejecting a bridge route's own path as a value
    // (see redirectQuery.spec.ts), not in the guard omitting it here.
    expect(router.currentRoute.value.name).toBe('sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/welcome')
  })

  it('sends an unauthenticated visitor away from the registration-error route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/welcome/error')

    expect(router.currentRoute.value.name).toBe('sign-in')
  })

  it('lets a signed-in visitor stay on the registering route while idle/in-flight', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registering')

    await router.push('/welcome')

    expect(router.currentRoute.value.name).toBe('registering')
  })

  it('redirects a signed-in visitor away from the registering route once registration has actually failed', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('failed')

    await router.push('/welcome')

    expect(router.currentRoute.value.name).toBe('registration-error')
  })

  it('redirects a signed-in visitor away from registration-error back to registering if reached without an actual failure', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('idle')

    await router.push('/welcome/error')

    expect(router.currentRoute.value.name).toBe('registering')
  })

  it('lets a registered visitor reach a node route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')

    await router.push('/path/nodes/node-abc')

    expect(router.currentRoute.value.name).toBe('node')
    expect(router.currentRoute.value.params.nodeId).toBe('node-abc')
  })

  it('sends an unauthenticated visitor from a node route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/path/nodes/node-abc')

    expect(router.currentRoute.value.name).toBe('sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/path/nodes/node-abc')
  })

  it('resolves an unknown path to the not-found route', async () => {
    await router.push('/no/such/page')

    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('keeps the home route public', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('home')
  })
})
