import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthoringListState } from '@/features/teacher/composables/useAuthoringListState'
import type { AuthoringSection } from '@/features/teacher/utils/authoringListQuery'

const SKILL_A = '3f4b6f2a-8c3e-4b1a-9d2e-7a1c5f0e9b21'
const SKILL_B = '7a2d9e10-4f3b-4c5a-8e6d-1b2c3d4e5f60'

type ListState = ReturnType<typeof useAuthoringListState>

function testRouter() {
  const page = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/teach/diagrams', name: 'teacher-diagrams', component: page },
      { path: '/teach/exercises', name: 'teacher-exercises', component: page },
    ],
  })
}

async function mountList(section: AuthoringSection, fullPath: string, router: Router = testRouter()) {
  await router.push(fullPath)
  await router.isReady()
  let list!: ListState
  const Host = defineComponent({
    setup() {
      list = useAuthoringListState(section)
      return () => null
    },
  })
  const wrapper = mount(Host, { global: { plugins: [router] } })
  await flush()
  return { list, router, wrapper }
}

async function flush() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('useAuthoringListState', () => {
  it('reads the search, filters and sort from the address', async () => {
    const { list } = await mountList('diagrams', `/teach/diagrams?q=box&sort=updated&kind=custom&skill=${SKILL_A}`)

    expect(list.state.q).toBe('box')
    expect(list.searchText.value).toBe('box')
    expect(list.state.sort).toBe('updated')
    expect(list.state.filters.kind).toBe('custom')
    expect(list.state.filters.skills).toEqual([SKILL_A])
  })

  it('writes a new sort to the address', async () => {
    const { list, router } = await mountList('diagrams', '/teach/diagrams')

    list.setSort('updated')
    await flush()

    expect(router.currentRoute.value.query).toEqual({ sort: 'updated' })
  })

  it('applies a whole set of filters at once', async () => {
    const { list, router } = await mountList('diagrams', '/teach/diagrams?sort=updated')

    list.setFilters({ skills: [SKILL_A, SKILL_B], concepts: [], root: 'A' })
    await flush()

    expect(router.currentRoute.value.query).toEqual({ sort: 'updated', root: 'A', skill: [SKILL_A, SKILL_B] })
  })

  it('removes one chosen skill and keeps the others', async () => {
    const { list } = await mountList('diagrams', `/teach/diagrams?skill=${SKILL_A}&skill=${SKILL_B}`)

    list.removeFilter('skills', SKILL_A)

    expect(list.state.filters.skills).toEqual([SKILL_B])
  })

  it('removes a single filter', async () => {
    const { list } = await mountList('diagrams', '/teach/diagrams?kind=custom&root=A')

    list.removeFilter('kind')

    expect(list.state.filters).toEqual({ skills: [], concepts: [], root: 'A' })
  })

  it('clears every filter but keeps the search, the sort and the status chip', async () => {
    const { list } = await mountList('diagrams', '/teach/diagrams?q=pentatonic&sort=updated&instrument=' + SKILL_A)

    list.clearFilters()

    expect(list.state.filters).toEqual({ skills: [], concepts: [] })
    expect(list.state.q).toBe('pentatonic')
    expect(list.state.sort).toBe('updated')
  })

  it('applies the search once typing pauses', async () => {
    const { list } = await mountList('diagrams', '/teach/diagrams')
    vi.useFakeTimers()
    try {
      list.searchText.value = 'penta'
      await nextTick()
      expect(list.state.q).toBe('')

      vi.advanceTimersByTime(300)
      expect(list.state.q).toBe('penta')
    } finally {
      vi.useRealTimers()
    }
  })

  it('remembers the state per section and restores it when the list opens without one', async () => {
    const first = await mountList('diagrams', '/teach/diagrams')
    first.list.setSort('updated')
    first.list.setFilters({ skills: [], concepts: [], kind: 'custom' })
    await flush()
    first.wrapper.unmount()

    const again = await mountList('diagrams', '/teach/diagrams')

    expect(again.list.state.sort).toBe('updated')
    expect(again.list.state.filters.kind).toBe('custom')
    expect(again.router.currentRoute.value.query).toEqual({ sort: 'updated', kind: 'custom' })
  })

  it('keeps each section to its own remembered state', async () => {
    const diagrams = await mountList('diagrams', '/teach/diagrams')
    diagrams.list.setFilters({ skills: [], concepts: [], kind: 'custom' })
    await flush()
    diagrams.wrapper.unmount()

    const exercises = await mountList('exercises', '/teach/exercises')
    exercises.list.setFilters({ skills: [], concepts: [], type: 'audio_recognition' })
    await flush()
    exercises.wrapper.unmount()

    const back = await mountList('diagrams', '/teach/diagrams')
    expect(back.list.state.filters).toEqual({ skills: [], concepts: [], kind: 'custom' })
  })

  it('lets an address with a state win over the remembered one', async () => {
    const first = await mountList('diagrams', '/teach/diagrams')
    first.list.setSort('updated')
    await flush()
    first.wrapper.unmount()

    const linked = await mountList('diagrams', '/teach/diagrams?root=E')

    expect(linked.list.state.sort).toBe('title')
    expect(linked.list.state.filters.root).toBe('E')
  })

  it('keeps the state when the open list is opened again without one', async () => {
    const { list, router } = await mountList('diagrams', '/teach/diagrams?kind=custom')

    await router.push('/teach/diagrams')
    await flush()

    expect(list.state.filters.kind).toBe('custom')
    expect(router.currentRoute.value.query).toEqual({ kind: 'custom' })
  })

  it('follows the browser back to an earlier list state', async () => {
    const { list, router } = await mountList('diagrams', '/teach/diagrams?kind=custom')

    await router.push('/teach/diagrams?kind=templates')
    await flush()

    expect(list.state.filters.kind).toBe('templates')
  })

  it('works without storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    const { list, router } = await mountList('diagrams', '/teach/diagrams')
    list.setSort('updated')
    await flush()

    expect(router.currentRoute.value.query).toEqual({ sort: 'updated' })
  })
})
