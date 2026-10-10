import { config } from '@vue/test-utils'
import { vi } from 'vitest'

import adminEn from '@/features/admin/locales/en.json'
import adminPtBr from '@/features/admin/locales/pt-BR.json'
import authEn from '@/features/auth/locales/en.json'
import authPtBr from '@/features/auth/locales/pt-BR.json'
import studentEn from '@/features/student/locales/en.json'
import studentPtBr from '@/features/student/locales/pt-BR.json'
import teacherEn from '@/features/teacher/locales/en.json'
import teacherPtBr from '@/features/teacher/locales/pt-BR.json'
import { i18n } from '@/i18n'
import { overlayInPlaceKey } from '@/shared/composables/overlayInPlace'

// Every component test mounts against the same global i18n instance the app
// uses, with all known feature locales merged in eagerly — component tests
// exercise rendered text, and a component may render before its route's
// `beforeEnter` lazy-merge would normally have run.
i18n.global.mergeLocaleMessage('en', studentEn)
i18n.global.mergeLocaleMessage('pt-BR', studentPtBr)
i18n.global.mergeLocaleMessage('en', authEn)
i18n.global.mergeLocaleMessage('pt-BR', authPtBr)
i18n.global.mergeLocaleMessage('en', teacherEn)
i18n.global.mergeLocaleMessage('pt-BR', teacherPtBr)
i18n.global.mergeLocaleMessage('en', adminEn)
i18n.global.mergeLocaleMessage('pt-BR', adminPtBr)

config.global.plugins.push(i18n)

// Overlays teleport to <body> so no container's stacking can cover them. jsdom can't show
// stacking anyway, so component tests keep them in place, inside the wrapper they query; the story
// tests in Chromium run the real teleport.
config.global.provide = { ...config.global.provide, [overlayInPlaceKey as symbol]: true }

// Vue Router invokes the browser scroll API for navigation. jsdom exposes the
// method but intentionally throws because it cannot model layout, so replace
// it once for every test environment.
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn()
}
