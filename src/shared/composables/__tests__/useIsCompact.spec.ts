import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import { useIsCompact } from '@/shared/composables/useIsCompact'

function mockMatchMedia(initialMatches: boolean) {
  const listeners: ((event: { matches: boolean }) => void)[] = []
  const mql = {
    matches: initialMatches,
    media: '(max-width: 767px)',
    addEventListener: vi.fn((_: string, listener: (event: { matches: boolean }) => void) => {
      listeners.push(listener)
    }),
    removeEventListener: vi.fn(),
  }
  window.matchMedia = vi.fn().mockReturnValue(mql)
  return {
    mql,
    fire(matches: boolean) {
      mql.matches = matches
      listeners.forEach((listener) => listener({ matches }))
    },
  }
}

function mountProbe() {
  let result!: ReturnType<typeof useIsCompact>
  const Probe = defineComponent({
    setup() {
      result = useIsCompact()
      return () => h('div')
    },
  })
  const wrapper = mount(Probe)
  return { wrapper, get isCompact() { return result.isCompact } }
}

describe('useIsCompact', () => {
  it('reflects a narrow viewport as compact on mount', () => {
    mockMatchMedia(true)

    const { isCompact } = mountProbe()

    expect(isCompact.value).toBe(true)
  })

  it('reflects a wide viewport as not compact on mount', () => {
    mockMatchMedia(false)

    const { isCompact } = mountProbe()

    expect(isCompact.value).toBe(false)
  })

  it('updates reactively when the viewport crosses the breakpoint', () => {
    const { fire } = mockMatchMedia(false)
    const { isCompact } = mountProbe()

    fire(true)
    expect(isCompact.value).toBe(true)

    fire(false)
    expect(isCompact.value).toBe(false)
  })

  it('removes its media query listener on unmount', () => {
    const { mql } = mockMatchMedia(false)
    const { wrapper } = mountProbe()

    wrapper.unmount()

    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
