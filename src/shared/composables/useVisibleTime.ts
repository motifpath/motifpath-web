import { onScopeDispose } from 'vue'

/**
 * Counts the time the page is visible to the student: in the foreground, not hidden behind another
 * tab or app. Each lap is the visible time since the one before, or since the start, so every
 * practice event can say how long the session was on screen since the event before it.
 */
export function useVisibleTime() {
  /** Visible time counted up to `since`, for the lap running now. */
  let counted = 0
  /** When the page last became visible; null while it is hidden or nothing has started. */
  let since: number | null = null
  let started = false

  function onChange() {
    if (!started) return
    const now = Date.now()
    if (document.visibilityState === 'visible') {
      since ??= now
    } else if (since !== null) {
      counted += now - since
      since = null
    }
  }

  function start() {
    if (started) return
    started = true
    counted = 0
    since = document.visibilityState === 'visible' ? Date.now() : null
    document.addEventListener('visibilitychange', onChange)
  }

  /** The visible time since the last lap, or the start, in whole milliseconds; the next lap counts from now. */
  function lap(): number {
    const now = Date.now()
    const total = counted + (since === null ? 0 : now - since)
    counted = 0
    if (since !== null) since = now
    return Math.max(0, Math.round(total))
  }

  onScopeDispose(() => document.removeEventListener('visibilitychange', onChange))

  return { start, lap }
}
