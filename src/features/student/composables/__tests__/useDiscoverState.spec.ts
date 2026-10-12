import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useDiscoverState } from '@/features/student/composables/useDiscoverState'
import { i18n, toApiLanguageCode } from '@/i18n'

const TEACHER = '0b6f5d7e-1c2a-4e3b-9f8d-6a5b4c3d2e1f'
const SKILL = '7a2d9e10-4f3b-4c5a-8e6d-1b2c3d4e5f60'

type DiscoverState = ReturnType<typeof useDiscoverState>

function testRouter() {
  const page = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/courses', name: 'course-catalog', component: page },
      { path: '/paths', name: 'path-catalog', component: page },
      { path: '/courses/:courseId', name: 'course-detail', component: page },
    ],
  })
}

async function flush() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function mountDiscover(fullPath: string, router: Router = testRouter()) {
  await router.push(fullPath)
  await router.isReady()
  let discover!: DiscoverState
  const Host = defineComponent({
    setup() {
      discover = useDiscoverState()
      return () => null
    },
  })
  mount(Host, { global: { plugins: [router] } })
  await flush()
  return { discover, router }
}

const appLanguage = () => toApiLanguageCode(i18n.global.locale.value)

afterEach(() => vi.useRealTimers())

describe('useDiscoverState', () => {
  it('opens a bare Discover on the app language, written into the address', async () => {
    const { discover, router } = await mountDiscover('/courses')

    expect(discover.state.filters.language).toBe(appLanguage())
    expect(router.currentRoute.value.query).toEqual({ language: appLanguage() })
  })

  it('reads the segment, search and filters from the address', async () => {
    const { discover } = await mountDiscover(`/paths?q=chords&level=beginner&teacher=${TEACHER}`)

    expect(discover.segment.value).toBe('paths')
    expect(discover.searchText.value).toBe('chords')
    expect(discover.state.q).toBe('chords')
    expect(discover.state.filters.levels).toEqual(['beginner'])
    expect(discover.state.filters.teacher).toBe(TEACHER)
    expect(discover.state.filters.language).toBeUndefined()
  })

  it('applies the search once typing pauses', async () => {
    const { discover, router } = await mountDiscover('/courses?level=beginner')
    vi.useFakeTimers()

    discover.searchText.value = 'blues'
    await nextTick()
    expect(router.currentRoute.value.query.q).toBeUndefined()

    await vi.advanceTimersByTimeAsync(300)
    vi.useRealTimers()
    await flush()
    expect(discover.state.q).toBe('blues')
    expect(router.currentRoute.value.query).toEqual({ q: 'blues', level: ['beginner'] })
  })

  it('keeps the search and filters when switching segment, replacing the entry', async () => {
    const router = testRouter()
    await router.push('/')
    const { discover } = await mountDiscover('/courses?q=blues&level=beginner', router)
    const replace = vi.spyOn(router, 'replace')

    discover.setSegment('paths')
    await flush()

    expect(replace).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('path-catalog')
    expect(router.currentRoute.value.query).toEqual({ q: 'blues', level: ['beginner'] })
  })

  it('applies a whole set of filters at once', async () => {
    const { discover, router } = await mountDiscover('/courses?q=blues')

    discover.setFilters({ levels: ['beginner', 'intermediate'], teacher: TEACHER, skills: [], concepts: [] })
    await flush()

    expect(router.currentRoute.value.query).toEqual({ q: 'blues', level: ['beginner', 'intermediate'], teacher: TEACHER })
  })

  it('removes one level and keeps the others', async () => {
    const { discover } = await mountDiscover('/courses?level=beginner&level=advanced')

    discover.removeFilter('levels', 'beginner')
    await flush()

    expect(discover.state.filters.levels).toEqual(['advanced'])
  })

  it('removes a skill arrived from context', async () => {
    const { discover, router } = await mountDiscover(`/courses?skill_ids=${SKILL}`)

    discover.removeFilter('skills', SKILL)
    await flush()

    expect(router.currentRoute.value.query).toEqual({})
  })

  it('clears every filter but keeps the search', async () => {
    const { discover, router } = await mountDiscover(`/courses?q=blues&level=beginner&language=en&skill_ids=${SKILL}`)

    discover.clearFilters()
    await flush()

    expect(router.currentRoute.value.query).toEqual({ q: 'blues' })
    expect(discover.searchText.value).toBe('blues')
  })

  it('follows the browser back to an earlier list', async () => {
    const router = testRouter()
    const { discover } = await mountDiscover('/courses?q=blues', router)
    await router.push('/courses?q=chords')
    await flush()
    expect(discover.state.q).toBe('chords')

    router.back()
    await flush()
    await flush()

    expect(discover.state.q).toBe('blues')
    expect(discover.searchText.value).toBe('blues')
  })
  it('leaves its list alone while the address moves on to a detail', async () => {
    const { discover, router } = await mountDiscover('/courses?q=blues&level=beginner')

    await router.push({ name: 'course-detail', params: { courseId: 'c1' } })
    await flush()

    expect(discover.state.q).toBe('blues')
    expect(discover.state.filters.levels).toEqual(['beginner'])
    expect(router.currentRoute.value.fullPath).toBe('/courses/c1')
  })
})
