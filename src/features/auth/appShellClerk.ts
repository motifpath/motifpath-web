import { loadClerkJSScript } from '@clerk/shared/loadClerkJsScript'

import { CLERK_JS_VERSION, keepClientTokenIn, type ClientTokenKeeper } from '@/features/auth/utils/clerkClientToken'
import { platformSecureStorage } from '@/shared/platform/secureStorage'

let keeper: ClientTokenKeeper | null = null

/**
 * Starts loading the pinned clerk-js release. The Clerk plugin, installed afterwards, waits for this
 * same script instead of loading its own unpinned one.
 */
export function loadPinnedClerkJs(publishableKey: string): Promise<unknown> {
  return loadClerkJSScript({ publishableKey, __internal_clerkJSVersion: CLERK_JS_VERSION })
}

/**
 * Inside the app shell, makes Clerk keep its client token in secure storage, before Clerk loads.
 * Without it the student would be signed out at every launch.
 */
export async function prepareClerkForAppShell(clerkJsLoaded: Promise<unknown>): Promise<void> {
  await clerkJsLoaded
  keeper = await keepClientTokenIn(Reflect.get(window, 'Clerk'), platformSecureStorage())
}

/** Forgets the client token kept in the app shell; nothing is kept in a browser. */
export async function forgetAppShellClientToken(): Promise<void> {
  await keeper?.forget()
}
