import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { createApp, h } from 'vue'
import { createRouter, createWebHistory, RouterView, type RouteRecordRaw } from 'vue-router'

import PageBackBar from './PageBackBar.vue'

const meta = {
  title: 'Navigation/PageBackBar',
  component: PageBackBar,
  args: { title: 'Major triads', to: { name: 'path' }, backLabel: 'Back to My path' },
} satisfies Meta<typeof PageBackBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** A long path title stays on one line. */
export const LongPortuguese: Story = {
  args: { title: 'Tríades maiores nas cordas agudas e suas inversões', backLabel: 'Voltar para Minha trilha' },
}

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Mounts the bar on a lesson page with a real router and the browser's own history: jsdom doesn't
 * model a step back. `from` is the page the lesson was opened from, if any.
 */
async function lessonOpenedFrom(canvasElement: HTMLElement, from: 'path' | 'home' | null) {
  const start = window.location.href
  const base = window.location.pathname
  const page = (id: string) => ({ render: () => h('p', { id }, id) })
  const lesson = {
    render: () => h(PageBackBar, { title: 'Major triads', to: { name: 'path' }, backLabel: 'Back to My path' }),
  }
  const routes: RouteRecordRaw[] = [
    { path: `${base}-path`, name: 'path', component: page('my-path') },
    { path: `${base}-home`, name: 'home', component: page('home') },
    { path: `${base}-lesson`, name: 'node', component: lesson },
  ]
  const router = createRouter({ history: createWebHistory(), routes })
  if (from) await router.push({ name: from })
  await router.push({ name: 'node' })
  const app = createApp({ render: () => h(RouterView) }).use(router)
  app.mount(canvasElement.querySelector('#back-bar-host')!)
  await router.isReady()
  const cleanUp = () => {
    app.unmount()
    window.history.replaceState(null, '', start)
  }
  return { router, cleanUp }
}

/** Opened from My path: the arrow steps back, so My path isn't stacked on top of the lesson. */
export const StepsBackToThePageBehind: Story = {
  render: () => ({ template: '<div id="back-bar-host"></div>' }),
  play: async ({ canvasElement, userEvent }) => {
    const { router, cleanUp } = await lessonOpenedFrom(canvasElement, 'path')
    try {
      await userEvent.click(canvasElement.querySelector('[data-test="page-back"]')!)
      await settle(300)

      await expect(router.currentRoute.value.name).toBe('path')
      // A step back leaves the lesson ahead, not behind: Back from My path doesn't return to it.
      await expect(router.options.history.state.forward).not.toBeNull()
    } finally {
      cleanUp()
    }
  },
}

/** Opened from Home: the arrow still leads to My path, the page it names. */
export const OpensItsPageFromElsewhere: Story = {
  render: () => ({ template: '<div id="back-bar-host"></div>' }),
  play: async ({ canvasElement, userEvent }) => {
    const { router, cleanUp } = await lessonOpenedFrom(canvasElement, 'home')
    try {
      await userEvent.click(canvasElement.querySelector('[data-test="page-back"]')!)
      await settle(300)

      await expect(router.currentRoute.value.name).toBe('path')
      await expect(router.options.history.state.back).toContain('-lesson')
    } finally {
      cleanUp()
    }
  },
}
