import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { clerkPlugin } from '@clerk/vue'

import App from '@/App.vue'
import { router } from '@/router'
import '@/assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(clerkPlugin, { publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY })
app.use(router)

app.mount('#app')
