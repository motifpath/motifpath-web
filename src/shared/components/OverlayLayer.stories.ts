import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { createApp, defineComponent, h, ref } from 'vue'
import { createRouter, createWebHistory, onBeforeRouteLeave, onBeforeRouteUpdate, RouterView, useRouter } from 'vue-router'

import { i18n } from '@/i18n'
import { installOverlayHistory } from '@/shared/composables/useOverlayHistory'

import ConfirmDialog from './ConfirmDialog.vue'

import OverlayLayer from './OverlayLayer.vue'

const meta = {
  title: 'Overlays/OverlayLayer',
  component: OverlayLayer,
  args: { open: true },
  render: (args) => ({
    components: { OverlayLayer },
    setup: () => ({ args }),
    template: `
      <OverlayLayer v-bind="args">
        <div class="w-[min(30rem,calc(100vw-2rem))] rounded-xl bg-surface-raised p-5 shadow-level3">
          <p class="text-sm text-ink">Anything drawn over the page sits on this layer.</p>
        </div>
      </OverlayLayer>`,
  }),
} satisfies Meta<typeof OverlayLayer>

export default meta
type Story = StoryObj<typeof meta>

export const Centred: Story = {}
export const AlongTheBottom: Story = { args: { placement: 'bottom' } }

// History behaviour in a real browser, with a real router: jsdom doesn't model how a step back and
// a router push interleave, so these only prove anything here. Each starts its own small app on
// the story's URL and puts the URL back when it's done.
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Act = (canvas: HTMLElement, userEvent: { click: (el: Element) => Promise<void>; keyboard: (keys: string) => Promise<void> }) => Promise<void>

function historyStory(page: ReturnType<typeof defineComponent>, act: Act, endsOn: 'page' | 'other' = 'other'): Story {
  return {
    render: () => ({ template: '<div id="history-host"></div>' }),
    play: async ({ canvasElement, userEvent }) => {
      const start = window.location.href
      const base = window.location.pathname
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: base, name: 'page', component: page },
          { path: `${base}-other`, name: 'other', component: { render: () => h('p', { id: 'other-page' }, 'Other page') } },
        ],
      })
      installOverlayHistory(router)
      await router.push({ name: 'page' })
      const app = createApp({ render: () => h(RouterView) }).use(router).use(i18n)
      app.mount(canvasElement.querySelector('#history-host')!)
      await router.isReady()
      try {
        await act(canvasElement, userEvent)
        await settle(600)
        await expect(router.currentRoute.value.name).toBe(endsOn)
        await expect(window.location.pathname).toBe(endsOn === 'page' ? base : `${base}-other`)
      } finally {
        app.unmount()
        window.history.replaceState(null, '', start)
      }
    },
  }
}

/** A layer closed by the same click that navigates (a menu row that links somewhere) lands on the new page. */
export const ClosesAndNavigates: Story = historyStory(
  defineComponent({
    components: { OverlayLayer },
    setup() {
      const open = ref(true)
      const router = useRouter()
      return {
        open,
        go: () => {
          open.value = false
          void router.push({ name: 'other' })
        },
      }
    },
    template: `<OverlayLayer :open="open" @close="open = false"><button id="go" @click="go">Go</button></OverlayLayer>`,
  }),
  async (canvas, userEvent) => {
    await settle(100)
    await userEvent.click(document.querySelector<HTMLElement>('#go')!)
  },
)

/** Confirming "discard and leave" from an unsaved-changes guard leaves the page. */
export const DiscardAndLeave: Story = historyStory(
  defineComponent({
    components: { ConfirmDialog },
    setup() {
      const open = ref(false)
      const router = useRouter()
      let answer: ((leave: boolean) => void) | null = null
      onBeforeRouteLeave(() => {
        open.value = true
        return new Promise<boolean>((resolve) => (answer = resolve))
      })
      return {
        open,
        go: () => void router.push({ name: 'other' }),
        settle: (leave: boolean) => {
          open.value = false
          answer?.(leave)
        },
      }
    },
    template: `<div><button id="go" @click="go">Leave</button>
      <ConfirmDialog :open="open" title="Discard your changes?" message="Your edits are lost." confirm-label="Discard"
        @confirm="settle(true)" @cancel="settle(false)" /></div>`,
  }),
  async (canvas, userEvent) => {
    await userEvent.click(document.querySelector<HTMLElement>('#go')!)
    await settle(200)
    await userEvent.click(document.querySelector('[data-test="confirm-dialog-confirm"]')!)
  },
)

let routeUpdates = 0

/** A page whose guards count any navigation that reaches it, with a layer to open and close. */
const GuardedPage = defineComponent({
  components: { OverlayLayer },
  setup() {
    onBeforeRouteUpdate(() => {
      routeUpdates++
    })
    onBeforeRouteLeave(() => {
      routeUpdates++
    })
    routeUpdates = 0
    return { open: ref(false) }
  },
  template: `<div><button id="open" @click="open = true">Open</button>
    <OverlayLayer :open="open" @close="open = false"><button id="inside">Inside</button></OverlayLayer></div>`,
})

async function openThenClose(canvas: HTMLElement, close: () => Promise<void>, userEvent: Parameters<Act>[1]) {
  await userEvent.click(canvas.querySelector('#open')!)
  await settle(100)
  await expect(window.history.state?.overlay).toBeTruthy()
  await close()
  await settle(400)
  await expect(document.querySelector('#inside')).toBeNull()
  await expect(routeUpdates).toBe(0)
}

/** Back closes the layer and nothing else: same page, no step further back, no page guards run. */
export const BackClosesTheLayer: Story = historyStory(
  GuardedPage,
  async (canvas, userEvent) => openThenClose(canvas, async () => window.history.back(), userEvent),
  'page',
)

/** Closing with Esc takes the layer's entry back off without the page noticing. */
export const EscTakesTheEntryOff: Story = historyStory(
  GuardedPage,
  async (canvas, userEvent) => {
    await openThenClose(canvas, () => userEvent.keyboard('{Escape}'), userEvent)
    await expect(window.history.state?.overlay).toBeFalsy()
  },
  'page',
)
