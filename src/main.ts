window.addEventListener('error', (e) => console.error('[probe] error', e.message, e.filename, e.lineno))
window.addEventListener('unhandledrejection', (e) => console.error('[probe] rejection', String(e.reason), e.reason?.stack))
console.log('[probe] start', location.href)
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { clerkPlugin } from '@clerk/vue'

import App from '@/App.vue'
import { i18n } from '@/i18n'
import { router } from '@/router'
import { loadClerkLocalization } from '@/shared/utils/clerkLocalization'
import { resolveAnonymousLocale } from '@/stores/currentUser'
import { prepareNativeClerkClient } from '@/spikes/native-sign-in/nativeClerkClient'
import { isNativeApp } from '@/spikes/native-sign-in/nativeGoogleIdToken'
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

async function bootstrap() {
  const app = createApp(App)

  app.use(createPinia())

  const native = isNativeApp()
  if (native) await prepareNativeClerkClient(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

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

  router.isReady().then(() => console.log("[probe] router ready", router.currentRoute.value.fullPath)).catch((e) => console.error("[probe] router failed", String(e)))
  app.mount("#app")
  console.log("[probe] mounted")
}

void bootstrap()
