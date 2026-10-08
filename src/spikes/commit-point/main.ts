import { createApp } from 'vue'

import { i18n } from '@/i18n'
import CommitPointSpike from '@/spikes/commit-point/CommitPointSpike.vue'
import '@/assets/main.css'

createApp(CommitPointSpike).use(i18n).mount('#app')
