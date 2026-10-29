import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { clerkPlugin } from '@clerk/vue'

import App from '@/App.vue'
import { loadPinnedClerkJs, prepareClerkForAppShell } from '@/features/auth/appShellClerk'
import { i18n } from '@/i18n'
import { router } from '@/router'
import { loadClerkLocalization } from '@/shared/utils/clerkLocalization'
import { resolveAnonymousLocale } from '@/stores/currentUser'
import { playThroughSilentSwitch } from '@/shared/platform/audioSession'
import { installBackButton } from '@/shared/platform/backButton'
import { isNativeApp } from '@/shared/platform/platform'
import '@/assets/main.css'

async function resolveInitialClerkLocalization() {
  try {
    return await loadClerkLocalization(resolveAnonymousLocale())
  } catch {
    // A failed chunk load here (flaky network, stale deploy) must not block
    // the app from mounting at all over what's just Clerk's *initial*
    // localization — falling back to Clerk's own English default instead.
    return undefined
  }
}

/**
 * Inside the app shell, Clerk can't keep its session in cookies: it runs in native mode, its client
 * token kept by the app. A failure is reported, and the app still opens instead of a blank screen.
 */
async function prepareAppShellSignIn(clerkJsLoaded: Promise<unknown>) {
  try {
    await prepareClerkForAppShell(clerkJsLoaded)
  } catch (error) {
    console.error('Sign-in will not last beyond this launch:', error)
  }
}

async function bootstrap() {
  const native = isNativeApp()
  // Only inside the app shell: in a mobile browser the silent switch keeps muting the site.
  if (native) playThroughSilentSwitch()

  // The Clerk plugin waits for this script rather than loading its own. A browser doesn't wait for it
  // here: the plugin reports a failed load itself.
  const clerkJsLoaded = loadPinnedClerkJs(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
  if (native) await prepareAppShellSignIn(clerkJsLoaded)
  else void clerkJsLoaded.catch(() => undefined)

  const app = createApp(App)

  app.use(createPinia())

  // Only sets Clerk's *initial* localization — the anonymous-resolution
  // rules the app itself uses (a prior explicit choice on this device, else
  // the browser's language, else English). App.vue keeps this in sync with
  // later in-app locale changes via `updateClerkOptions`.
  app.use(clerkPlugin, {
    publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    localization: await resolveInitialClerkLocalization(),
    // Clerk navigates through the app's router, not a page load: back from Google it goes on
    // within the app, and after signing out it lands on the landing with the signed-out toast
    // still on screen.
    routerPush: (to) => router.push(to),
    routerReplace: (to) => router.replace(to),
    afterSignOutUrl: '/',
    standardBrowser: !native,
  })

  app.use(i18n)
  app.use(router)

  // Android's back gesture closes the top layer, then steps back, and leaves the app from Home.
  if (isNativeApp()) void installBackButton(router)

  app.mount('#app')
}

void bootstrap()
