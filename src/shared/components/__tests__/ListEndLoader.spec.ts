import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ListEndLoader from '@/shared/components/ListEndLoader.vue'

let report: ((entries: { isIntersecting: boolean }[]) => void) | null = null

beforeEach(() => {
  report = null
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        report = callback
      }
      observe() {}
      disconnect() {}
    },
  )
})

afterEach(() => vi.unstubAllGlobals())
enableAutoUnmount(afterEach)

function mountLoader(props: { hasMore: boolean; loading?: boolean; failed?: boolean }) {
  return mount(ListEndLoader, { props })
}

function scrollIntoView(visible = true) {
  report?.([{ isIntersecting: visible }])
}

describe('ListEndLoader', () => {
  it('asks for the next page when the end of the list comes into view', () => {
    const wrapper = mountLoader({ hasMore: true })

    scrollIntoView()

    expect(wrapper.emitted('load')).toHaveLength(1)
  })

  it('does not ask while the end is out of view', () => {
    const wrapper = mountLoader({ hasMore: true })

    scrollIntoView(false)

    expect(wrapper.emitted('load')).toBeUndefined()
  })

  it('does not ask when every item is loaded', () => {
    const wrapper = mountLoader({ hasMore: false })

    scrollIntoView()

    expect(wrapper.emitted('load')).toBeUndefined()
  })

  it('does not ask again while a page is loading, and says it is loading', () => {
    const wrapper = mountLoader({ hasMore: true, loading: true })

    scrollIntoView()

    expect(wrapper.emitted('load')).toBeUndefined()
    expect(wrapper.find('[data-test="list-end-loading"]').exists()).toBe(true)
  })

  it('asks for another page if the end is still in view once a page has loaded', async () => {
    const wrapper = mountLoader({ hasMore: true, loading: true })
    scrollIntoView()

    await wrapper.setProps({ loading: false })

    expect(wrapper.emitted('load')).toHaveLength(1)
  })

  it('offers Try again in place when a page failed, instead of asking again on its own', async () => {
    const wrapper = mountLoader({ hasMore: true, failed: true })

    scrollIntoView()
    expect(wrapper.emitted('load')).toBeUndefined()

    await wrapper.get('[data-test="list-end-retry"]').trigger('click')
    expect(wrapper.emitted('load')).toHaveLength(1)
  })
})
