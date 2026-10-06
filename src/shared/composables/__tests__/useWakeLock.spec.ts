import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, type Ref } from 'vue'

import { useWakeLock } from '@/shared/composables/useWakeLock'
import type { WakeLockPort } from '@/shared/platform/wakeLock'

function fakePort(): WakeLockPort & { acquire: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> } {
  return { acquire: vi.fn().mockResolvedValue(undefined), release: vi.fn().mockResolvedValue(undefined) }
}

function mountWith(active: Ref<boolean>, port: WakeLockPort) {
  return mount(
    defineComponent({
      setup() {
        useWakeLock(active, port)
        return () => h('div')
      },
    }),
  )
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useWakeLock', () => {
  it('keeps the screen on while active, and lets it go when no longer', async () => {
    const port = fakePort()
    const active = ref(false)
    mountWith(active, port)
    expect(port.acquire).not.toHaveBeenCalled()

    active.value = true
    await flushPromises()
    expect(port.acquire).toHaveBeenCalledOnce()

    active.value = false
    await flushPromises()
    expect(port.release).toHaveBeenCalledOnce()
  })

  it('lets the screen go when the component goes away', async () => {
    const port = fakePort()
    const wrapper = mountWith(ref(true), port)
    await flushPromises()

    wrapper.unmount()

    expect(port.release).toHaveBeenCalledOnce()
  })

  it('takes the lock again when the page comes back, since the browser drops it when hidden', async () => {
    const port = fakePort()
    mountWith(ref(true), port)
    await flushPromises()

    setVisibility('hidden')
    setVisibility('visible')
    await flushPromises()

    expect(port.acquire).toHaveBeenCalledTimes(2)
  })

  it('doesn’t take the lock on the page coming back while inactive', async () => {
    const port = fakePort()
    mountWith(ref(false), port)

    setVisibility('visible')
    await flushPromises()

    expect(port.acquire).not.toHaveBeenCalled()
  })
})
