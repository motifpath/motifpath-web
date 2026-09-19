import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { clerkPlugin } from '@clerk/vue'
import { enUS, ptBR } from '@clerk/localizations'

import App from '@/App.vue'
import { i18n } from '@/i18n'
import { router } from '@/router'
import { resolveAnonymousLocale } from '@/stores/currentUser'
import '@/assets/main.css'

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
  localization: resolveAnonymousLocale() === 'pt-BR' ? ptBR : enUS,
})

app.use(i18n)
app.use(router)

app.mount('#app')
