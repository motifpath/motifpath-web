import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { createRouter, createWebHistory, RouterView } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useListReturn } from '@/features/teacher/composables/useListReturn'

/** Set to make the next lists' pages fail. */
let pagesFail = false

/** A list of 100 items that loads 20 at a time, as the shared list does. */
function fakeList() {
  const itemCount = ref(20)
  const total = ref(100)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const error = ref(false)
  const loadMoreError = ref(false)
  const loadMore = vi.fn(async () => {
    if (pagesFail) loadMoreError.value = true
    else itemCount.value = Math.min(itemCount.value + 20, total.value)
  })
  return { itemCount, total, isLoading, isLoadingMore, error, loadMoreError, loadMore }
}

let list: ReturnType<typeof fakeList>

const ListPage = defineComponent({
  setup() {
    list = fakeList()
    useListReturn({ section: 'exercises', editorRoute: 'editor', idParam: 'id', list })
    return () => h('div', 'list')
  },
})

function testRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/list', name: 'list', component: ListPage },
      { path: '/edit/:id', name: 'editor', component: { render: () => h('div', 'editor') } },
      { path: '/elsewhere', name: 'elsewhere', component: { render: () => h('div', 'elsewhere') } },
    ],
  })
}

async function start() {
  const router = testRouter()
  await router.push('/list')
  await router.isReady()
  mount(defineComponent({ render: () => h(RouterView) }), { global: { plugins: [router] } })
  await flushPromises()
  return router
}

const scrollTo = vi.fn()

beforeEach(() => {
  pagesFail = false
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  scrollTo.mockReset()
  vi.stubGlobal('scrollTo', scrollTo)
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
})
afterEach(() => vi.unstubAllGlobals())

async function scrollTheListTo(y: number, loaded: number) {
  list.itemCount.value = loaded
  window.scrollY = y
}

describe('useListReturn', () => {
  it("comes back from an item's editor to the same place, loading the pages it had", async () => {
    const router = await start()
    await scrollTheListTo(1800, 60)
    await router.push('/edit/e-45')

    await router.push('/list')
    await flushPromises()

    expect(list.itemCount.value).toBe(60)
    expect(scrollTo).toHaveBeenLastCalledWith(0, 1800)
  })

  it("comes back to the same place with the browser's Back", async () => {
    const router = await start()
    await scrollTheListTo(900, 40)
    await router.push('/edit/e-30')

    router.back()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('list'))
    await flushPromises()

    expect(list.itemCount.value).toBe(40)
    expect(scrollTo).toHaveBeenLastCalledWith(0, 900)
  })

  it('opens at the top when reached from anywhere else', async () => {
    const router = await start()
    await scrollTheListTo(1800, 60)
    await router.push('/edit/e-45')
    await router.push('/elsewhere')

    await router.push('/list')
    await flushPromises()

    expect(list.itemCount.value).toBe(20)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('stops at what loaded when a page fails, and still goes back to the place', async () => {
    const router = await start()
    await scrollTheListTo(1800, 60)
    await router.push('/edit/e-45')
    pagesFail = true

    await router.push('/list')
    await flushPromises()

    expect(list.itemCount.value).toBe(20)
    expect(scrollTo).toHaveBeenCalledWith(0, 1800)
  })
})
