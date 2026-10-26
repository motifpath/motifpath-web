import { describe, expect, it, vi } from 'vitest'

import { capacitorSecureStorage, webSecureStorage, type NativeSecureStore } from '@/shared/platform/secureStorage'

/** A stand-in for the device keychain: a map behind the plugin's string methods. */
function fakeKeychain(): NativeSecureStore {
  const items = new Map<string, string>()
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  }
}

const adapters = [
  ['webSecureStorage', () => webSecureStorage()],
  ['capacitorSecureStorage', () => capacitorSecureStorage(fakeKeychain())],
] as const

describe.each(adapters)('%s', (_name, create) => {
  it('gives back what was stored under a key', async () => {
    const storage = create()

    await storage.set('client', 'token-1')

    await expect(storage.get('client')).resolves.toBe('token-1')
  })

  it('has nothing for a key never stored', async () => {
    await expect(create().get('client')).resolves.toBeNull()
  })

  it('forgets a removed key, and removing it again is harmless', async () => {
    const storage = create()
    await storage.set('client', 'token-1')

    await storage.remove('client')
    await storage.remove('client')

    await expect(storage.get('client')).resolves.toBeNull()
  })

  it('replaces a value stored again under the same key', async () => {
    const storage = create()

    await storage.set('client', 'token-1')
    await storage.set('client', 'token-2')

    await expect(storage.get('client')).resolves.toBe('token-2')
  })
})

describe('capacitorSecureStorage', () => {
  it('treats an unreadable keychain entry as missing, so the user is asked to sign in again', async () => {
    const keychain = { ...fakeKeychain(), getItem: vi.fn().mockRejectedValue(new Error('item is corrupt')) }

    await expect(capacitorSecureStorage(keychain).get('client')).resolves.toBeNull()
  })

  it('reports a failed write, so a credential is never thought kept when it is not', async () => {
    const keychain = { ...fakeKeychain(), setItem: vi.fn().mockRejectedValue(new Error('keychain locked')) }

    await expect(capacitorSecureStorage(keychain).set('client', 'token-1')).rejects.toThrow('keychain locked')
  })
})
