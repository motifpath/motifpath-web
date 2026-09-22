import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import { useMediaQuery } from '@/shared/composables/useMediaQuery'

const QUERY = '(max-width: 767px), (max-height: 500px)'

function mockMatchMedia(initialMatches: boolean) {
  const listeners: ((event: { matches: boolean }) => void)[] = []
  const mql = {
    matches: initialMatches,
    media: QUERY,
    addEventListener: vi.fn((_: string, listener: (event: { matches: boolean }) => void) => {
      listeners.push(listener)
    }),
    removeEventListener: vi.fn(),
  }
  const matchMedia = vi.fn().mockReturnValue(mql)
  window.matchMedia = matchMedia
  return {
    mql,
    matchMedia,
    fire(matches: boolean) {
      mql.matches = matches
      listeners.forEach((listener) => listener({ matches }))
    },
  }
}

function mountProbe(query: string) {
  let result!: ReturnType<typeof useMediaQuery>
  const Probe = defineComponent({
    setup() {
      result = useMediaQuery(query)
      return () => h('div')
    },
  })
  const wrapper = mount(Probe)
  return {
    wrapper,
    get matches() {
      return result.matches
    },
  }
}

describe('useMediaQuery', () => {
  it('reflects a matching query as true on mount', () => {
    mockMatchMedia(true)

    const { matches } = mountProbe(QUERY)

    expect(matches.value).toBe(true)
  })

  it('reflects a non-matching query as false on mount', () => {
    mockMatchMedia(false)

    const { matches } = mountProbe(QUERY)

    expect(matches.value).toBe(false)
  })

  it('updates reactively when the query starts and stops matching', () => {
    const { fire } = mockMatchMedia(false)
    const { matches } = mountProbe(QUERY)

    fire(true)
    expect(matches.value).toBe(true)

    fire(false)
    expect(matches.value).toBe(false)
  })

  it('removes its media query listener on unmount', () => {
    const { mql } = mockMatchMedia(false)
    const { wrapper } = mountProbe(QUERY)

    wrapper.unmount()

    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('registers exactly the query string it is given', () => {
    const { matchMedia } = mockMatchMedia(false)

    mountProbe(QUERY)

    expect(matchMedia).toHaveBeenCalledWith(QUERY)
  })
})
