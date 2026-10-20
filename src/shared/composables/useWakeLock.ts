import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

import { webWakeLock, type WakeLockPort } from '@/shared/platform/wakeLock'

/**
 * Keeps the screen on while `active` is true, and lets it go when it turns false or the
 * component goes away. The browser drops the lock whenever the page is hidden, so it is taken
 * again when the page comes back while still active.
 */
export function useWakeLock(active: Ref<boolean>, port: WakeLockPort = webWakeLock()) {
  let held = false

  function acquire() {
    held = true
    void port.acquire()
  }

  function release() {
    if (!held) return
    held = false
    void port.release()
  }

  function onVisibilityChange() {
    if (active.value && document.visibilityState === 'visible') acquire()
  }

  watch(active, (isActive) => (isActive ? acquire() : release()), { immediate: true })

  onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    release()
  })
}
