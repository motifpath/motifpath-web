import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'
import { createApp, defineComponent, h } from 'vue'
import { createRouter, createWebHistory, RouterView } from 'vue-router'

import { i18n } from '@/i18n'
import { installOverlayHistory } from '@/shared/composables/useOverlayHistory'
import { usePracticeTool } from '@/shared/composables/usePracticeTool'

import MetronomeTool from './MetronomeTool.vue'
import PracticeShell from './PracticeShell.vue'
import ToolsMenu from './ToolsMenu.vue'

const meta = {
  title: 'Practice/ToolsMenu',
  component: ToolsMenu,
  render: () => ({
    components: { ToolsMenu },
    template: '<div class="flex justify-end"><ToolsMenu /></div>',
  }),
} satisfies Meta<typeof ToolsMenu>

export default meta
type Story = StoryObj<typeof meta>

/** The wrench in the Practice Shell header's options slot. */
export const Closed: Story = {}

/** Tools: a sheet on a phone, a menu by the wrench on anything wider. */
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /tools|ferramentas/i }))
    await expect(within(document.body).getByRole('button', { name: /metronome|metrônomo/i })).toBeInTheDocument()
  },
}

// History in a real browser, with a real router: the Metronome page has its own entry, so Back
// returns to the setup on the same page. Each story starts its own small app on the story's URL
// and puts the URL back when it's done.
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** The setup with its Tools, as the practice setup holds them. */
const SetupPage = defineComponent({
  components: { MetronomeTool, PracticeShell, ToolsMenu },
  setup: () => usePracticeTool(),
  template: `
    <PracticeShell :exit-label="tool ? 'Back to practice' : 'Close'" :title="tool ? 'Metronome' : undefined" @exit="close">
      <template v-if="!tool" #options><ToolsMenu @open="open" /></template>
      <MetronomeTool v-if="tool === 'metronome'" />
      <p v-else id="setup">The setup</p>
    </PracticeShell>`,
})

function historyStory(act: (userEvent: { click: (el: Element) => Promise<void> }) => Promise<void>): Story {
  return {
    render: () => ({ template: '<div id="history-host"></div>' }),
    play: async ({ canvasElement, userEvent }) => {
      const start = window.location.href
      const base = window.location.pathname
      const router = createRouter({ history: createWebHistory(), routes: [{ path: base, name: 'setup', component: SetupPage }] })
      installOverlayHistory(router)
      await router.push({ name: 'setup' })
      const app = createApp({ render: () => h(RouterView) }).use(router).use(i18n)
      app.mount(canvasElement.querySelector('#history-host')!)
      await router.isReady()
      try {
        await userEvent.click(within(canvasElement).getByRole('button', { name: /tools|ferramentas/i }))
        await userEvent.click(await within(document.body).findByRole('button', { name: /metronome|metrônomo/i }))
        await settle(200)
        await expect(canvasElement.querySelector('[data-test="metronome-tool"]')).not.toBeNull()
        await act(userEvent)
        await settle(400)
        await expect(canvasElement.querySelector('#setup')).not.toBeNull()
        await expect(canvasElement.querySelector('[data-test="metronome-tool"]')).toBeNull()
        await expect(router.currentRoute.value.name).toBe('setup')
        await expect(window.location.pathname).toBe(base)
        // Nothing of the tool is left in the history: no entry of it is current.
        await expect(window.history.state?.overlay).toBeUndefined()
      } finally {
        app.unmount()
        window.history.replaceState(null, '', start)
      }
    },
  }
}

/** The device's Back on the Metronome returns to the setup, on the same page. */
export const BackReturnsToTheSetup: Story = historyStory(async () => {
  window.history.back()
})

/** The page's arrow returns to the setup too, taking the Metronome's entry back off. */
export const ArrowReturnsToTheSetup: Story = historyStory(async (userEvent) => {
  await userEvent.click(document.querySelector('[data-test="shell-exit"]')!)
})
