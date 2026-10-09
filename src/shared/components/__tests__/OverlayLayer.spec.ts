import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createRouter, createWebHistory, RouterView } from 'vue-router'

import OverlayLayer from '@/shared/components/OverlayLayer.vue'

let wrappers: VueWrapper[] = []
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount())
  wrappers = []
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
      const before = window.history.length

      await openFromTrigger(wrapper)
      expect(window.history.length).toBe(before + 1)

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
      // history.back() is asynchronous in a browser and in jsdom alike.
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(window.history.state?.overlay).toBeFalsy()
    })
  })

  describe('with the app router', () => {
    function settle() {
      return new Promise((resolve) => setTimeout(resolve, 30))
    }

    async function mountRoutedPage() {
      const routes = [
        { path: '/page', name: 'page', component: defineComponent({
          components: { OverlayLayer },
          setup: () => ({ open: ref(false) }),
          template: `<div><button data-test="trigger" @click="open = true">Open</button>
            <OverlayLayer :open="open" @close="open = false"><div data-test="panel"><button>In</button></div></OverlayLayer></div>`,
        }) },
        { path: '/other', name: 'other', component: { render: () => h('p', { 'data-test': 'other' }) } },
      ]
      const router = createRouter({ history: createWebHistory(), routes })
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
      await settle()

      expect(wrapper.find('[data-test="panel"]').exists()).toBe(false)
      expect(router.currentRoute.value.name).toBe('page')
    })

    it('closing the layer some other way does not leave the page', async () => {
      const { wrapper, router } = await mountRoutedPage()
      await wrapper.get('[data-test="trigger"]').trigger('click')
      await nextTick()

      await wrapper.get('[data-test="panel"]').trigger('keydown', { key: 'Escape' })
      await settle()

      expect(router.currentRoute.value.name).toBe('page')
      expect(window.location.pathname).toBe('/page')
    })

    it('navigating on from inside the layer lands on the new page, not back where it was', async () => {
      const { wrapper, router } = await mountRoutedPage()
      await wrapper.get('[data-test="trigger"]').trigger('click')
      await nextTick()

      await router.push('/other')
      await settle()

      expect(router.currentRoute.value.name).toBe('other')
      expect(wrapper.find('[data-test="other"]').exists()).toBe(true)
    })
  })
})
