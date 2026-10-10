import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

import { useTwoPanes } from '@/shared/composables/useTwoPanes'
import { mockViewport } from '@/shared/testUtils/viewport'

function mountProbe() {
  let result!: ReturnType<typeof useTwoPanes>
  const Probe = defineComponent({
    setup() {
      result = useTwoPanes()
      return () => h('div')
    },
  })
  const wrapper = mount(Probe)
  return { wrapper, get twoPanes() { return result.twoPanes } }
}

describe('useTwoPanes', () => {
  it('has room for two panes beside the sidebar from a 1120 px window', () => {
    mockViewport(1120)

    expect(mountProbe().twoPanes.value).toBe(true)
  })

  it('keeps one column in a narrower window, even one wide enough for the sidebar', () => {
    mockViewport(1119)

    expect(mountProbe().twoPanes.value).toBe(false)
  })

  it('answers before the first render, so a wide window never flashes one column', () => {
    mockViewport(1280)
    let atSetup: boolean | undefined
    mount(
      defineComponent({
        setup() {
          atSetup = useTwoPanes().twoPanes.value
          return () => h('div')
        },
      }),
    )

    expect(atSetup).toBe(true)
  })

  it('follows the window as it is resized', async () => {
    const viewport = mockViewport(1280)
    const probe = mountProbe()

    viewport.resize(900)
    await nextTick()

    expect(probe.twoPanes.value).toBe(false)
  })
})
