import { App } from '@capacitor/app'
import type { Router } from 'vue-router'

/** What Android's back gesture or button does: step back, open Home, or leave the app. */
export type BackAction = 'back' | 'home' | 'exit'

export interface BackState {
  /** A sheet, dialog or menu is open; it has its own history entry, on the same page. */
  layerOpen: boolean
  /** The student is on Home (or, signed out, the landing): the app's root. */
  onHome: boolean
  /** The WebView has an earlier history entry to return to. */
  canGoBack: boolean
}

/**
 * Back closes the top layer first, then goes back one page, as the browser's Back does. Home is
 * the way out: there Back leaves the app, with no "Exit?" question. A page opened with nothing
 * behind it (a cold start on a deep link) goes to Home rather than closing the app.
 */
export function backAction({ layerOpen, onHome, canGoBack }: BackState): BackAction {
  if (layerOpen) return 'back'
  if (onHome) return 'exit'
  return canGoBack ? 'back' : 'home'
}

/** The part of the device's app control that the back button handler relies on. */
export interface NativeBackButton {
  addListener(event: 'backButton', listener: (event: { canGoBack: boolean }) => void): Promise<unknown>
  exitApp(): Promise<void>
}

function layerIsOpen(): boolean {
  const state: unknown = window.history.state
  return typeof state === 'object' && state !== null && typeof Reflect.get(state, 'overlay') === 'string'
}

/**
 * Takes over Android's back gesture and button. Without a handler the system closes the app on
 * every Back, whatever is open.
 */
export async function installBackButton(router: Router, device: NativeBackButton = App): Promise<void> {
  await device.addListener('backButton', ({ canGoBack }) => {
    const action = backAction({
      layerOpen: layerIsOpen(),
      onHome: router.currentRoute.value.name === 'home',
      canGoBack,
    })
    if (action === 'back') window.history.back()
    else if (action === 'home') void router.replace({ name: 'home' })
    else void device.exitApp()
  })
}
