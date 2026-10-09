import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { getActivePinia } from 'pinia'
import { expect } from 'storybook/test'
import { createApp, defineComponent, h, onMounted, ref } from 'vue'
import { createRouter, createWebHistory, RouterView, useRouter, type RouteRecordRaw } from 'vue-router'

import { i18n } from '@/i18n'
import { installOverlayHistory } from '@/shared/composables/useOverlayHistory'
import { useToast } from '@/shared/composables/useToast'

import LearnerShell from './LearnerShell.vue'
import ToastStack from './ToastStack.vue'

const PAGE = `
  <section class="flex flex-col gap-3">
    <h1 class="text-xl font-semibold text-ink">Good evening</h1>
    <p v-for="n in 12" :key="n" class="rounded-lg bg-surface-raised p-4 text-sm text-ink-muted">Card {{ n }}</p>
  </section>`

/**
 * Renders the shell on `routeName` of the story router (added on the fly when `meta` is given, so a
 * story can stand on a page that hides the bottom bar).
 */
function shellOn(routeName: string, meta?: Record<string, unknown>) {
  return defineComponent({
    components: { LearnerShell },
    setup() {
      const router = useRouter()
      const ready = ref(false)
      onMounted(async () => {
        if (meta && !router.hasRoute(routeName)) {
          router.addRoute({ path: `/${routeName}`, name: routeName, meta, component: RouterView })
        }
        await router.replace({ name: routeName })
        ready.value = true
      })
      return { ready }
    },
    template: `<div class="-m-4"><LearnerShell v-if="ready">${PAGE}</LearnerShell></div>`,
  })
}

const onRoute = (routeName: string, meta?: Record<string, unknown>) => () => shellOn(routeName, meta)

const meta = {
  title: 'Navigation/LearnerShell',
  component: LearnerShell,
  render: onRoute('home'),
} satisfies Meta<typeof LearnerShell>

export default meta
type Story = StoryObj<typeof meta>

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A phone: slim top bar with the avatar, the five destinations along the bottom. */
export const Compact: Story = {
  globals: { viewport: { value: 'compact' } },
  play: async ({ canvasElement }) => {
    await settle(100)
    const bar = canvasElement.querySelector('[data-test="learner-top-bar"]')!.getBoundingClientRect()
    const avatar = canvasElement.querySelector('[data-test="learner-top-bar"] [data-test="account-menu-avatar"] span')!.getBoundingClientRect()
    await expect(avatar.height).toBe(32)
    await expect(avatar.top).toBeGreaterThanOrEqual(bar.top)
    await expect(avatar.bottom).toBeLessThanOrEqual(bar.bottom)
  },
}
/** A tablet: the rail, with the avatar at its foot. */
export const Medium: Story = { render: onRoute('path'), globals: { viewport: { value: 'medium' } } }
/** A desktop: the sidebar, with Teach for authors and the Account row at its foot. */
export const Expanded: Story = {
  render: onRoute('my-courses'),
  globals: { role: 'teacher', viewport: { value: 'expanded' } },
  // The sidebar spans the screen, with the Account row at its foot, however short the page.
  play: async ({ canvasElement }) => {
    await settle(100)
    const sidebar = canvasElement.querySelector('[data-test="navigation-sidebar"]')!.getBoundingClientRect()
    const account = canvasElement.querySelector('[data-test="navigation-sidebar"] [data-test="account-menu-avatar"]')!.getBoundingClientRect()
    await expect(sidebar.height).toBe(window.innerHeight)
    await expect(sidebar.bottom - account.bottom).toBeLessThan(40)
  },
}
export const LongPortuguese: Story = { render: onRoute('course-catalog'), globals: { locale: 'pt-BR', viewport: { value: 'compact' } } }

/** A lesson takes the phone's full height: no bottom bar. */
export const CompactLesson: Story = {
  render: onRoute('story-lesson', { hidesBottomBar: true }),
  globals: { viewport: { value: 'compact' } },
  play: async ({ canvasElement }) => {
    await settle(100)
    await expect(canvasElement.querySelector('[data-test="navigation-bar"]')).toBeNull()
  },
}

/** A toast rises above the bottom bar instead of covering it. */
export const ToastAboveTheBar: Story = {
  globals: { viewport: { value: 'compact' } },
  render: () => ({
    components: { Shell: shellOn('home'), ToastStack },
    setup() {
      onMounted(() => useToast().neutral('Switched to Major triads', { action: { label: 'Undo', run: () => {} } }))
    },
    template: '<div><Shell /><ToastStack /></div>',
  }),
  play: async ({ canvasElement }) => {
    await settle(300)
    const bar = canvasElement.querySelector('[data-test="navigation-bar"]')!.getBoundingClientRect()
    const toast = document.querySelector('[data-test="toast"]')!.getBoundingClientRect()
    await expect(toast.bottom).toBeLessThanOrEqual(bar.top)
    useToast().clear()
  },
}

/**
 * Back closes the account menu before it leaves the destination. History in a real browser with a
 * real router: jsdom doesn't model how a step back and the overlay's history entry interleave.
 */
export const BackClosesTheMenuFirst: Story = {
  globals: { viewport: { value: 'compact' } },
  render: () => ({ template: '<div id="shell-host"></div>' }),
  play: async ({ canvasElement, userEvent }) => {
    const start = window.location.href
    const base = window.location.pathname
    const page = { render: () => h(LearnerShell, null, () => h('p', { id: 'learning-page' }, 'Learning')) }
    const names = ['my-courses', 'practice-session', 'path', 'course-catalog', 'credits', 'teacher-content']
    const routes: RouteRecordRaw[] = [
      { path: base, name: 'home', component: page },
      ...names.map((name) => ({ path: `${base}-${name}`, name, component: page })),
    ]
    const router = createRouter({ history: createWebHistory(), routes })
    installOverlayHistory(router)
    // The student came to Learning from Home, so a step back has somewhere to leave to.
    await router.push({ name: 'home' })
    await router.push({ name: 'my-courses' })
    const app = createApp({ render: () => h(RouterView) }).use(router).use(i18n).use(getActivePinia()!)
    app.mount(canvasElement.querySelector('#shell-host')!)
    await router.isReady()
    try {
      await userEvent.click(canvasElement.querySelector('[data-test="account-menu-avatar"]')!)
      await settle(200)
      await expect(document.querySelector('[data-test="account-menu"]')).not.toBeNull()

      window.history.back()
      await settle(600)

      await expect(document.querySelector('[data-test="account-menu"]')).toBeNull()
      await expect(router.currentRoute.value.name).toBe('my-courses')
      await expect(canvasElement.querySelector('#learning-page')).not.toBeNull()
    } finally {
      app.unmount()
      window.history.replaceState(null, '', start)
    }
  },
}
