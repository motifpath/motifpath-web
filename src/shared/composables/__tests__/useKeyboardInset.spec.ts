import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import { useKeyboardInset } from '@/shared/composables/useKeyboardInset'

type ViewportListener = () => void

/** A visualViewport whose height the test shrinks, as an on-screen keyboard does. */
function mockVisualViewport(height: number) {
  const listeners: ViewportListener[] = []
  const viewport = {
    height,
    offsetTop: 0,
    addEventListener: (_: string, listener: ViewportListener) => listeners.push(listener),
    removeEventListener: (_: string, listener: ViewportListener) => {
      listeners.splice(listeners.indexOf(listener), 1)
    },
  }
  Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true })
  return {
    resize(next: number) {
      viewport.height = next
      listeners.forEach((listener) => listener())
    },
    listenerCount: () => listeners.length,
  }
}

function mountProbe() {
  let inset = { value: -1 }
  const Probe = defineComponent({
    setup() {
      inset = useKeyboardInset()
      return () => h('div')
    },
  })
  const wrapper = mount(Probe)
  return { wrapper, inset: () => inset.value }
}

describe('useKeyboardInset', () => {
  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true })
  })

  it('is 0 while no keyboard covers the page', () => {
    window.innerHeight = 800
    mockVisualViewport(800)

    expect(mountProbe().inset()).toBe(0)
  })

  it('follows the height the on-screen keyboard covers', async () => {
    window.innerHeight = 800
    const viewport = mockVisualViewport(800)
    const { inset } = mountProbe()

    viewport.resize(500)
    await nextTick()

    expect(inset()).toBe(300)
  })

  it('stops listening once its component is gone', () => {
    window.innerHeight = 800
    const viewport = mockVisualViewport(800)
    const { wrapper } = mountProbe()

    wrapper.unmount()

    expect(viewport.listenerCount()).toBe(0)
  })

  it('is 0 in a browser without visualViewport', () => {
    expect(mountProbe().inset()).toBe(0)
  })
})
