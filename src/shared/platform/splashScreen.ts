import { SplashScreen } from '@capacitor/splash-screen'
import { watch, type Ref } from 'vue'

/** The part of the device's launch screen control that the app relies on. */
export interface NativeSplash {
  hide(): Promise<void>
}

/** How long the launch screen may wait before the first screen shows its own loading state. */
const LONGEST_HOLD_MS = 10_000

/**
 * Keeps the launch screen up until the first screen can render, so the student never sees a
 * blank page while sign-in resolves. If that takes too long, the launch screen gives way anyway
 * and the screen shows its own loading state.
 */
export function holdSplashUntilReady(ready: Ref<boolean>, splash: NativeSplash = SplashScreen): void {
  let hidden = false

  function hide() {
    if (hidden) return
    hidden = true
    clearTimeout(timer)
    stop()
    splash.hide().catch(() => undefined)
  }

  const timer = setTimeout(hide, LONGEST_HOLD_MS)
  const stop = watch(ready, (isReady) => {
    if (isReady) hide()
  })
  if (ready.value) hide()
}
