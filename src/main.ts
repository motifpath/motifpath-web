import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { clerkPlugin } from '@clerk/vue'

import App from '@/App.vue'
import { i18n } from '@/i18n'
import { router } from '@/router'
import { resolveAnonymousLocale } from '@/stores/currentUser'
import '@/assets/main.css'

// @clerk/localizations' own index re-exports every locale it ships (~50), so
// importing from it directly would bundle all of them into this entry chunk.
// Each locale also has its own subpath export (`@clerk/localizations/pt-BR`),
// letting a dynamic import here pull in only the one this visitor needs.
async function loadClerkLocalization() {
  return resolveAnonymousLocale() === 'pt-BR'
    ? (await import('@clerk/localizations/pt-BR')).ptBR
    : (await import('@clerk/localizations/en-US')).enUS
}

async function bootstrap() {
  const app = createApp(App)

  app.use(createPinia())

  // Clerk's hosted <SignIn /> UI reads its `localization` option once, at plugin
  // install time — it has no reactive prop for switching locale afterward like
  // vue-i18n does, so this only gets the *initial* locale right (the same
  // anonymous-resolution rules the app itself uses: a prior explicit choice on
  // this device, else the browser's language, else English). A visitor who
  // changes the in-app language later still sees Clerk's widget in whichever
  // locale was resolved here until a full page reload re-runs this plugin
  // install — a follow-up would need to remount the Clerk component to make
  // that switch reactive.
  app.use(clerkPlugin, {
    publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    localization: await loadClerkLocalization(),
  })

  app.use(i18n)
  app.use(router)

  app.mount('#app')
}

void bootstrap()
