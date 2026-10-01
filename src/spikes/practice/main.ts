// The voice shim goes first: the API clients capture `fetch` when they're created.
import '@/spikes/practice/voiceShim'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { i18n } from '@/i18n'
import SpikeApp from '@/spikes/practice/SpikeApp.vue'
import '@/assets/main.css'

createApp(SpikeApp).use(createPinia()).use(i18n).mount('#app')
