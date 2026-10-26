import { SecureStorage } from '@aparajita/capacitor-secure-storage'

import { isNativeApp } from '@/shared/platform/platform'

/**
 * Keeping a small secret, such as a long-lived sign-in credential, where other scripts in the
 * page can't read it. A port, so the app runs unchanged in a browser and inside the app shell:
 * each platform supplies its own adapter.
 */
export interface SecureStoragePort {
  /** The value stored under `key`, or null when there is none or it can't be read. */
  get(key: string): Promise<string | null>
  /** Stores `value` under `key`, replacing any earlier value; rejects when it can't be kept. */
  set(key: string, value: string): Promise<void>
  /** Forgets `key`; harmless when nothing is stored under it. */
  remove(key: string): Promise<void>
}

/** The string methods of the device's secure store that the app shell adapter relies on. */
export interface NativeSecureStore {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/**
 * The browser keeps its sign-in in cookies, so nothing there needs a secret to outlive the page.
 * Values live in memory only: localStorage would expose them to every script in the page.
 */
export function webSecureStorage(): SecureStoragePort {
  const items = new Map<string, string>()

  return {
    async get(key) {
      return items.get(key) ?? null
    },
    async set(key, value) {
      items.set(key, value)
    },
    async remove(key) {
      items.delete(key)
    },
  }
}

/** The iOS Keychain or the Android Keystore. */
export function capacitorSecureStorage(store: NativeSecureStore = SecureStorage): SecureStoragePort {
  return {
    async get(key) {
      try {
        return await store.getItem(key)
      } catch {
        return null
      }
    },
    set: (key, value) => store.setItem(key, value),
    remove: (key) => store.removeItem(key),
  }
}

/** The adapter for the platform the page runs on. */
export function platformSecureStorage(): SecureStoragePort {
  return isNativeApp() ? capacitorSecureStorage() : webSecureStorage()
}
