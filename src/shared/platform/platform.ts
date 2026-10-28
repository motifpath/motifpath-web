import { Capacitor } from '@capacitor/core'

/** Whether the page runs inside the iOS or Android app shell rather than a browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}
