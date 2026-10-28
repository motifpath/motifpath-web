import { KeepAwake } from '@capacitor-community/keep-awake'

import { isNativeApp } from '@/shared/platform/platform'

/**
 * Keeping the screen on during a practice run. A port, so the app runs unchanged in a browser
 * and inside the app shell: each platform supplies its own adapter.
 */
export interface WakeLockPort {
  /** Keeps the screen on; resolves even where that isn't possible. */
  acquire(): Promise<void>
  /** Lets the screen turn off again; harmless when the screen isn't held. */
  release(): Promise<void>
}

interface WakeLockSentinelLike {
  release(): Promise<void>
}

interface NavigatorWithWakeLock {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> }
}

/** The Screen Wake Lock API. A browser without it, or one that refuses (low battery), leaves the screen as it is. */
export function webWakeLock(): WakeLockPort {
  let sentinel: WakeLockSentinelLike | null = null

  return {
    async acquire() {
      const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock
      if (!wakeLock) return
      try {
        sentinel = await wakeLock.request('screen')
      } catch {
        sentinel = null
      }
    },
    async release() {
      const held = sentinel
      sentinel = null
      await held?.release().catch(() => undefined)
    },
  }
}

/** The methods of the device's keep-awake control that the app shell adapter relies on. */
export interface NativeKeepAwake {
  keepAwake(): Promise<void>
  allowSleep(): Promise<void>
}

/** The device's own keep-awake control, in the iOS and Android app shells. */
export function capacitorWakeLock(device: NativeKeepAwake = KeepAwake): WakeLockPort {
  return {
    async acquire() {
      await device.keepAwake().catch(() => undefined)
    },
    async release() {
      await device.allowSleep().catch(() => undefined)
    },
  }
}

/** The adapter for the platform the page runs on. */
export function platformWakeLock(): WakeLockPort {
  return isNativeApp() ? capacitorWakeLock() : webWakeLock()
}
