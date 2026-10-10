import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as VueRouter from 'vue-router'

// The browser history this page sits on: `back` is the entry behind it, if any.
const historyState: { back: string | null } = { back: null }
const back = vi.fn()
const push = vi.fn()
const ROUTE_NAMES: Record<string, string> = { '/path': 'path', '/home': 'home' }
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      options: { history: { state: historyState } },
      resolve: (to: string | { name: string }) => ({ name: typeof to === 'string' ? ROUTE_NAMES[to] : to.name }),
      back,
      push,
    }),
  }
})

const { default: PageBackBar } = await import('@/shared/components/PageBackBar.vue')

function mountBar() {
  return mount(PageBackBar, { props: { title: 'Major triads', to: { name: 'path' }, backLabel: 'Back to My path' } })
}

describe('PageBackBar', () => {
  beforeEach(() => {
    historyState.back = null
    back.mockReset()
    push.mockReset()
  })

  it('names where it goes for assistive technology, and the page beside the arrow', () => {
    const wrapper = mountBar()

    expect(wrapper.get('[data-test="page-back"]').attributes('aria-label')).toBe('Back to My path')
    expect(wrapper.get('[data-test="page-back-title"]').text()).toBe('Major triads')
  })

  it('steps back when the page behind it is the one it leads to, so that page keeps its scroll and Back does not return here', async () => {
    historyState.back = '/path'

    await mountBar().get('[data-test="page-back"]').trigger('click')

    expect(back).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('opens the page it leads to when this one was opened directly', async () => {
    await mountBar().get('[data-test="page-back"]').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'path' })
    expect(back).not.toHaveBeenCalled()
  })

  it('opens the page it leads to when another page is behind this one', async () => {
    historyState.back = '/home'

    await mountBar().get('[data-test="page-back"]').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'path' })
    expect(back).not.toHaveBeenCalled()
  })
})
