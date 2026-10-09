import { fetchesSettled } from './mocks/fetchesInFlight'
import { setup, type Preview } from '@storybook/vue3-vite'
import { setupWorker } from 'msw/browser'
import { mswLoader } from 'msw-storybook-addon/csf3'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import adminEn from '../src/features/admin/locales/en.json'
import adminPtBr from '../src/features/admin/locales/pt-BR.json'
import authEn from '../src/features/auth/locales/en.json'
import authPtBr from '../src/features/auth/locales/pt-BR.json'
import studentEn from '../src/features/student/locales/en.json'
import studentPtBr from '../src/features/student/locales/pt-BR.json'
import teacherEn from '../src/features/teacher/locales/en.json'
import teacherPtBr from '../src/features/teacher/locales/pt-BR.json'
import { i18n, type SupportedLocale } from '../src/i18n'
import { router as appRouter } from '../src/router'
import { clearEmbeddedDiagramCache } from '../src/shared/composables/useEmbeddedDiagram'
import { clearVoiceCache } from '../src/shared/composables/useListVoices'
import { defaultHandlers } from '../src/shared/testUtils/msw/handlers'
import { useCurrentUserStore } from '../src/stores/currentUser'
import '../src/assets/main.css'

// A story may render text from any feature, so every feature's messages are
// merged up front instead of waiting for a route to load them.
for (const [locale, messages] of [
  ['en', studentEn],
  ['pt-BR', studentPtBr],
  ['en', authEn],
  ['pt-BR', authPtBr],
  ['en', teacherEn],
  ['pt-BR', teacherPtBr],
  ['en', adminEn],
  ['pt-BR', adminPtBr],
] as const) {
  i18n.global.mergeLocaleMessage(locale, messages)
}

// Stories answer API calls from the mock API. An API call (a fetch to another
// origin) that no handler covers fails the story, so a story can't quietly sit
// in a loading state or reach a real backend. Same-origin requests are
// Storybook's own files; images, audio and other subresources aren't API calls.
const unmockedCalls: string[] = []

async function startMockApi() {
  const worker = setupWorker()
  await worker.start({
    quiet: true,
    onUnhandledRequest(request, print) {
      if (request.destination !== '' || new URL(request.url).origin === window.location.origin) return
      unmockedCalls.push(`${request.method} ${request.url}`)
      print.error()
    },
  })
  return worker
}

const pinia = createPinia()
setActivePinia(pinia)

// The app's route names, so `RouterLink`s resolve, without the app's guards
// or browser history: a story never navigates away from itself.
const router = createRouter({
  history: createMemoryHistory(),
  routes: appRouter.getRoutes().map((route) => ({
    path: route.path,
    name: route.name,
    component: RouterView,
  })),
})

setup((app) => {
  app.use(pinia)
  app.use(i18n)
  app.use(router)
})

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'UI language — pt-BR runs longer than English',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'pt-BR', title: 'Português (Brasil)' },
        ],
        dynamicTitle: true,
      },
    },
    role: {
      description: 'Signed-in role — decides which sections navigation offers',
      toolbar: {
        title: 'Role',
        icon: 'user',
        items: ['student', 'teacher', 'admin'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
    locale: 'en',
    role: 'student',
    viewport: { value: 'compact', isRotated: false },
  },
  loaders: [
    mswLoader(startMockApi),
    // Voices and diagrams are kept for the page's lifetime; each story asks
    // again, so one story's mocked answer never leaks into the next.
    () => {
      clearVoiceCache()
      clearEmbeddedDiagramCache()
      unmockedCalls.length = 0
    },
  ],
  async afterEach() {
    // An unmatched call is only reported once the mock API has seen it.
    await fetchesSettled(1000)
    if (unmockedCalls.length > 0) {
      throw new Error(`API calls with no mock handler (add one in src/shared/testUtils/msw/handlers.ts):\n${unmockedCalls.join('\n')}`)
    }
  },
  decorators: [
    (story, context) => {
      const { theme, locale, role } = context.globals as {
        theme: 'light' | 'dark'
        locale: SupportedLocale
        role: 'student' | 'teacher' | 'admin'
      }
      // The store picks a locale from the browser when it is first created,
      // so it is created before the toolbar's locale is applied.
      const currentUser = useCurrentUserStore()
      document.documentElement.classList.toggle('dark', theme === 'dark')
      i18n.global.locale.value = locale
      currentUser.profile = {
        user_id: '00000000-0000-4000-8000-000000000001',
        role,
        display_name: 'Ana Souza',
        locale: { code: locale.replace('-', '_'), name: locale },
        registered_at: '2026-01-01T00:00:00Z',
      }
      return { components: { story }, template: '<div class="min-h-screen bg-surface p-4 text-ink"><story /></div>' }
    },
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { matchers: { color: /(background|color)$/i } },
    a11y: { test: 'todo' },
    msw: { handlers: defaultHandlers },
    viewport: {
      options: {
        compact: { name: 'Compact — phone (390)', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        medium: { name: 'Medium — tablet (720)', styles: { width: '720px', height: '1024px' }, type: 'tablet' },
        expanded: { name: 'Expanded — desktop (1280)', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
      },
    },
  },
}

export default preview
