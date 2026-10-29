import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createRouter, createWebHistory, onBeforeRouteUpdate, RouterView } from 'vue-router'

import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import { overlayInPlaceKey } from '@/shared/composables/overlayInPlace'
import { installOverlayHistory } from '@/shared/composables/useOverlayHistory'

let wrappers: VueWrapper[] = []
// jsdom steps through history asynchronously, like a browser, and how long that takes depends on
// how loaded the test run is: tests wait for the outcome itself, never for a fixed pause.
const WAIT = { timeout: 2000 }

/** Waits until the current history entry is no layer's. */
function layerEntryGone() {
  return vi.waitFor(() => expect(window.history.state?.overlay).toBeFalsy(), WAIT)
}

afterEach(async () => {
  wrappers.forEach((wrapper) => wrapper.unmount())
  wrappers = []
  // A layer unmounted while open takes its history entry off a moment later; let that finish
  // here rather than inside the next test. A test that leaves a layer's entry behind on purpose
  // never sees it go, so the wait gives up quietly and the entry is cleared by hand.
  await layerEntryGone().catch(() => undefined)
  window.history.replaceState(null, '')
})

/** A page with a trigger button and a layer it opens, attached to the document so focus is real. */
function mountPage(layerProps: Record<string, unknown> = {}) {
  const Page = defineComponent({
    components: { OverlayLayer },
    setup() {
      const open = ref(false)
      return { open, layerProps }
    },
    template: `
      <div>
        <button data-test="trigger" @click="open = true">Open</button>
        <OverlayLayer :open="open" v-bind="layerProps" @close="open = false">
          <div data-test="panel">
            <button data-test="first">First</button>
            <button data-test="last">Last</button>
          </div>
        </OverlayLayer>
      </div>`,
  })
  const wrapper = mount(Page, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

async function openFromTrigger(wrapper: VueWrapper) {
  const trigger = wrapper.get<HTMLButtonElement>('[data-test="trigger"]')
  trigger.element.focus()
  await trigger.trigger('click')
  await nextTick()
}

function popstate() {
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
}

describe('OverlayLayer', () => {
  it('renders nothing while closed', () => {
    const wrapper = mountPage()

    expect(wrapper.find('[data-test="overlay-scrim"]').exists()).toBe(false)
  })

  it('closes on a tap on the scrim, but not on a tap inside the layer', async () => {
    const wrapper = mountPage()
    await openFromTrigger(wrapper)

    await wrapper.get('[data-test="panel"]').trigger('click')
    expect(wrapper.find('[data-test="panel"]').exists()).toBe(true)

    await wrapper.get('[data-test="overlay-scrim"]').trigger('click')
    expect(wrapper.find('[data-test="panel"]').exists()).toBe(false)
  })

  it('stays open on a tap on the scrim when it asks for a decision', async () => {
    const wrapper = mountPage({ closeOnScrim: false })
    await openFromTrigger(wrapper)

    await wrapper.get('[data-test="overlay-scrim"]').trigger('click')

    expect(wrapper.find('[data-test="panel"]').exists()).toBe(true)
  })

  it('closes on Esc', async () => {
    const wrapper = mountPage()
    await openFromTrigger(wrapper)

    await wrapper.get('[data-test="panel"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[data-test="panel"]').exists()).toBe(false)
  })

  it('moves focus into the layer when it opens and back to the trigger when it closes', async () => {
    const wrapper = mountPage()
    await openFromTrigger(wrapper)

    expect(document.activeElement).toBe(wrapper.get('[data-test="first"]').element)

    await wrapper.get('[data-test="panel"]').trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('[data-test="trigger"]').element)
  })

  it('keeps Tab inside the layer, wrapping at both ends', async () => {
    const wrapper = mountPage()
    await openFromTrigger(wrapper)
    const first = wrapper.get<HTMLButtonElement>('[data-test="first"]')
    const last = wrapper.get<HTMLButtonElement>('[data-test="last"]')

    last.element.focus()
    await last.trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(first.element)

    await first.trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last.element)
  })

  describe('Back', () => {
    it('adds a history entry when it opens, so Back closes the layer before it leaves the page', async () => {
      const wrapper = mountPage()
      expect(window.history.state?.overlay).toBeFalsy()

      await openFromTrigger(wrapper)
      expect(window.history.state?.overlay).toBeTruthy()

      // The browser has already stepped back to the page's entry when popstate fires.
      window.history.replaceState(null, '')
      popstate()
      await nextTick()

      expect(wrapper.find('[data-test="panel"]').exists()).toBe(false)
    })

    it('takes its own history entry back off when it closes some other way', async () => {
      const wrapper = mountPage()
      await openFromTrigger(wrapper)
      expect(window.history.state?.overlay).toBeTruthy()

      await wrapper.get('[data-test="panel"]').trigger('keydown', { key: 'Escape' })

      await layerEntryGone()
    })
  })

  describe('with the app router', () => {
    let routeUpdates = 0

    async function mountRoutedPage() {
      routeUpdates = 0
      const routes = [
        {
          path: '/page',
          name: 'page',
          component: defineComponent({
            components: { OverlayLayer },
            setup: () => {
              onBeforeRouteUpdate(() => {
                routeUpdates++
              })
              return { open: ref(false) }
            },
            template: `<div><button data-test="trigger" @click="open = true">Open</button>
              <OverlayLayer :open="open" @close="open = false"><div data-test="panel"><button>In</button></div></OverlayLayer></div>`,
          }),
        },
        { path: '/other', name: 'other', component: { render: () => h('p', { 'data-test': 'other' }) } },
      ]
      const router = createRouter({ history: createWebHistory(), routes })
      installOverlayHistory(router)
      await router.push('/page')
      await router.isReady()
      const wrapper = mount({ render: () => h(RouterView) }, { global: { plugins: [router] }, attachTo: document.body })
      wrappers.push(wrapper)
      return { wrapper, router }
    }

    it('Back closes the layer and stays on the page', async () => {
      const { wrapper, router } = await mountRoutedPage()
      await wrapper.get('[data-test="trigger"]').trigger('click')
      await nextTick()

      window.history.back()
      await vi.waitFor(() => expect(wrapper.find('[data-test="panel"]').exists()).toBe(false), WAIT)

      expect(router.currentRoute.value.name).toBe('page')
    })

    it('closing the layer some other way does not leave the page', async () => {
      const { wrapper, router } = await mountRoutedPage()
      await wrapper.get('[data-test="trigger"]').trigger('click')
      await nextTick()

      await wrapper.get('[data-test="panel"]').trigger('keydown', { key: 'Escape' })
      await layerEntryGone()

      expect(router.currentRoute.value.name).toBe('page')
      expect(window.location.pathname).toBe('/page')
    })

    it('navigating on from inside the layer lands on the new page, not back where it was', async () => {
      const { wrapper, router } = await mountRoutedPage()
      await wrapper.get('[data-test="trigger"]').trigger('click')
      await nextTick()

      await router.push('/other')

      await vi.waitFor(() => expect(wrapper.find('[data-test="other"]').exists()).toBe(true), WAIT)
      expect(router.currentRoute.value.name).toBe('other')
    })

    it("stepping over the layer's own entry is not a navigation: the page's route guards don't run", async () => {
      const { wrapper } = await mountRoutedPage()
      await wrapper.get('[data-test="trigger"]').trigger('click')
      await nextTick()
      await wrapper.get('[data-test="panel"]').trigger('keydown', { key: 'Escape' })
      await layerEntryGone()

      await wrapper.get('[data-test="trigger"]').trigger('click')
      await nextTick()
      window.history.back()
      await vi.waitFor(() => expect(wrapper.find('[data-test="panel"]').exists()).toBe(false), WAIT)

      expect(routeUpdates).toBe(0)
    })

    it("closing the layer as part of a navigation leaves the layer's entry behind instead of stepping back over the new page", async () => {
      const { wrapper, router } = await mountRoutedPage()
      await wrapper.get('[data-test="trigger"]').trigger('click')
      await nextTick()
      const back = vi.spyOn(window.history, 'back')

      await wrapper.get('[data-test="panel"]').trigger('keydown', { key: 'Escape' })
      void router.push('/other')
      await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('other'), WAIT)
      // Gives a wrong step back the chance to happen; a slow run can only make this pass late,
      // never fail it.
      await new Promise((resolve) => setTimeout(resolve, 30))

      expect(back).not.toHaveBeenCalled()
      back.mockRestore()
    })
  })

  describe('on <body>', () => {
    it('opens on <body>, outside the container it was opened from, carrying the attributes it was given', async () => {
      const wrapper = mount(
        defineComponent({
          components: { OverlayLayer },
          template: `
            <div data-test="opener" class="sticky z-10">
              <OverlayLayer :open="true" data-test="named-layer"><div data-test="panel" /></OverlayLayer>
            </div>`,
        }),
        { attachTo: document.body, global: { provide: { [overlayInPlaceKey as symbol]: false } } },
      )
      wrappers.push(wrapper)
      await nextTick()

      const layer = document.querySelector('[data-test="named-layer"]')
      expect(layer?.parentElement).toBe(document.body)
      expect(layer?.querySelector('[data-test="panel"]')).not.toBeNull()
      expect(document.querySelector('[data-test="opener"] [data-test="panel"]')).toBeNull()
    })
  })

  describe('device edges', () => {
    const area = () => document.querySelector('[data-test="overlay-area"]')!.classList

    it('keeps a centred layer inside every inset', async () => {
      await openFromTrigger(mountPage({ placement: 'center' }))

      expect([...area()]).toEqual(expect.arrayContaining(['top-inset-top', 'bottom-inset-bottom', 'left-inset-left', 'right-inset-right']))
    })

    it('never lets a sheet rise into the status bar, and lets it reach the bottom edge', async () => {
      await openFromTrigger(mountPage({ placement: 'bottom' }))

      expect(area()).toContain('top-inset-top')
      expect(area()).toContain('bottom-0')
    })

    it('leaves the whole screen to a layer that places itself', async () => {
      await openFromTrigger(mountPage({ placement: 'none' }))

      expect(area()).toContain('inset-0')
    })

    it('dims the whole screen, system bars included', async () => {
      await openFromTrigger(mountPage())

      expect(document.querySelector('[data-test="overlay-scrim"]')!.classList).toContain('inset-0')
    })
  })
})
