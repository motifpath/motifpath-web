import { config } from '@vue/test-utils'

import studentEn from '@/features/student/locales/en.json'
import studentPtBr from '@/features/student/locales/pt-BR.json'
import { i18n } from '@/i18n'

// Every component test mounts against the same global i18n instance the app
// uses, with all known feature locales merged in eagerly — component tests
// exercise rendered text, and a component may render before its route's
// `beforeEnter` lazy-merge would normally have run.
i18n.global.mergeLocaleMessage('en', studentEn)
i18n.global.mergeLocaleMessage('pt-BR', studentPtBr)

config.global.plugins.push(i18n)
