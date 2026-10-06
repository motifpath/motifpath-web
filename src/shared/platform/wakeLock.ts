/**
 * Keeping the screen on during a practice run. A port, so the app runs unchanged in a browser
 * now and inside Capacitor later: each platform supplies its own adapter.
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
