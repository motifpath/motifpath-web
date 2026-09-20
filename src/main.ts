import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { clerkPlugin } from '@clerk/vue'

import App from '@/App.vue'
import { i18n } from '@/i18n'
import { router } from '@/router'
import { loadClerkLocalization } from '@/shared/utils/clerkLocalization'
import { resolveAnonymousLocale } from '@/stores/currentUser'
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

  // Only sets Clerk's *initial* localization — the anonymous-resolution
  // rules the app itself uses (a prior explicit choice on this device, else
  // the browser's language, else English). App.vue keeps this in sync with
  // later in-app locale changes via `updateClerkOptions`.
  app.use(clerkPlugin, {
    publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    localization: await resolveInitialClerkLocalization(),
  })

  app.use(i18n)
  app.use(router)

  app.mount('#app')
}

void bootstrap()
