import { describe, expect, it, vi } from 'vitest'

import { googleAccountPicker } from '@/shared/platform/googleAccount'

const CLIENTS = { webClientId: 'web-client', iOSClientId: 'ios-client' }

/** A stand-in for the platform's Google sign-in: hands back `idToken` from the account picker. */
function fakeGoogle(idToken: string | null = 'google-id-token') {
  const calls: string[] = []
  const plugin = {
    initialize: vi.fn(async () => void calls.push('initialize')),
    logout: vi.fn(async () => void calls.push('logout')),
    login: vi.fn(async () => {
      calls.push('login')
      return { result: { idToken } }
    }),
  }
  return { plugin, calls }
}

describe('googleAccountPicker', () => {
  it('resolves the ID token of the account picked', async () => {
    const google = fakeGoogle('token-for-dora')

    await expect(googleAccountPicker(google.plugin, CLIENTS)()).resolves.toBe('token-for-dora')
  })

  it('makes the web client the token audience on every platform', async () => {
    const google = fakeGoogle()

    await googleAccountPicker(google.plugin, CLIENTS)()

    expect(google.plugin.initialize).toHaveBeenCalledWith({
      google: { webClientId: 'web-client', iOSClientId: 'ios-client', iOSServerClientId: 'web-client', mode: 'online' },
    })
  })

  it('asks Google for a fresh token on every attempt, since Clerk refuses a token it has seen', async () => {
    const google = fakeGoogle()
    const pick = googleAccountPicker(google.plugin, CLIENTS)

    await pick()
    await pick()

    expect(google.calls).toEqual(['initialize', 'logout', 'login', 'logout', 'login'])
  })

  it('still opens the picker when there was no Google sign-in to end', async () => {
    const google = fakeGoogle()
    google.plugin.logout.mockRejectedValueOnce(new Error('not signed in'))

    await expect(googleAccountPicker(google.plugin, CLIENTS)()).resolves.toBe('google-id-token')
  })

  it('rejects when the picker is closed', async () => {
    const google = fakeGoogle()
    google.plugin.login.mockRejectedValueOnce(new Error('the user canceled the sign-in flow'))

    await expect(googleAccountPicker(google.plugin, CLIENTS)()).rejects.toThrow('canceled')
  })

  it('rejects when Google hands back no ID token', async () => {
    const google = fakeGoogle(null)

    await expect(googleAccountPicker(google.plugin, CLIENTS)()).rejects.toThrow('no ID token')
  })
})
