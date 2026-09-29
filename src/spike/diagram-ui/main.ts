import { createApp } from 'vue'
import { i18n } from '@/i18n'
import '@/assets/main.css'
import Study from './DiagramStudy.vue'
import { installStudyVoiceFixture } from './voiceFixture'
installStudyVoiceFixture()
createApp(Study).use(i18n).mount('#app')
