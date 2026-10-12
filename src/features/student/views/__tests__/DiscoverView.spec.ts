import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockViewport } from '@/shared/testUtils/viewport'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { saveCatalogReturn } from '@/features/student/utils/catalogReturn'
import DiscoverView from '@/features/student/views/DiscoverView.vue'

const BRUNO = { user_id: '0b6f5d7e-1c2a-4e3b-9f8d-6a5b4c3d2e1f', display_name: 'Bruno' }
const GUITAR = '3f4b6f2a-8c3e-4b1a-9d2e-7a1c5f0e9b21'

function course(id: string, title: string) {
  return { course_id: id, title, summary: '', level: 'beginner', language: 'en', created_by: BRUNO, instrument_ids: [GUITAR], checkpoint_count: 4, lesson_count: 44 }
}
function path(id: string, title: string) {
  return { learning_path_id: id, title, summary: '', level: 'beginner', language: 'en', created_by: BRUNO, instrument_ids: [GUITAR], lesson_count: 9 }
}

const COURSES = [course('c-blues', 'Blues basics'), course('c-finger', 'Fingerstyle foundations'), course('c-rhythm', 'Reading rhythm')]
const PATHS = [path('lp-shuffle', 'Blues shuffle'), path('lp-open', 'Open chords')]

interface World {
  courses: unknown[] | 'fail'
  paths: unknown[] | 'fail'
  enrollments: unknown[]
}
let world: World

function envelope(items: unknown[], options?: { params?: { query?: { limit?: number; offset?: number } } }) {
  const limit = options?.params?.query?.limit ?? 20
  const offset = options?.params?.query?.offset ?? 0
  return { data: { items: items.slice(offset, offset + limit), total: items.length, limit, offset } }
}

beforeEach(() => {
  world = { courses: COURSES, paths: PATHS, enrollments: [] }
  GET.mockReset()
  GET.mockImplementation((url: string, options?: Parameters<typeof envelope>[1]) => {
    if (url === '/catalog/courses') return Promise.resolve(world.courses === 'fail' ? { error: {} } : envelope(world.courses, options))
    if (url === '/catalog/paths') return Promise.resolve(world.paths === 'fail' ? { error: {} } : envelope(world.paths, options))
    if (url === '/students/me/course-enrollments') return Promise.resolve({ data: world.enrollments })
    if (url === '/instruments') return Promise.resolve({ data: [{ instrument_id: GUITAR, names: { en: 'Guitar' }, languages: ['en'] }] })
    return Promise.resolve({ data: [] })
  })
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  mockViewport(390)
  window.localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())

function testRouter() {
  const page = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/courses', name: 'course-catalog', component: DiscoverView },
      { path: '/paths', name: 'path-catalog', component: DiscoverView },
      { path: '/courses/:courseId', name: 'course-detail', component: page },
      { path: '/paths/:learningPathId', name: 'path-detail', component: page },
    ],
  })
}

async function openDiscover(fullPath = '/courses?language=en'): Promise<{ view: VueWrapper; router: Router }> {
  const router = testRouter()
  await router.push(fullPath)
  await router.isReady()
  const view = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { view, router }
}

const titles = (view: VueWrapper) => view.findAll('[data-test="catalog-title"]').map((title) => title.text())

describe('DiscoverView', () => {
  it('opens on courses, listed by title with a count line', async () => {
    const { view } = await openDiscover()

    expect(view.get('[data-test="discover-courses"]').attributes('aria-checked')).toBe('true')
    expect(view.get('[data-test="discover-count"]').text()).toBe('3 courses · A–Z')
    expect(titles(view)).toEqual(['Blues basics', 'Fingerstyle foundations', 'Reading rhythm'])
  })

  it('opens a course’s detail from its row', async () => {
    const { view } = await openDiscover()

    const link = view.findAll('[data-test="catalog-card"]')[0]
    expect(link.attributes('href')).toBe('/courses/c-blues')
  })

  it('lists paths behind the Paths control, keeping the search and filters', async () => {
    const { view, router } = await openDiscover('/courses?q=blues&level=beginner')

    await view.get('[data-test="discover-paths"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('path-catalog')
    expect(router.currentRoute.value.query).toEqual({ q: 'blues', level: ['beginner'] })
    expect(titles(view)).toEqual(['Blues shuffle', 'Open chords'])
    expect(view.get('[data-test="discover-count"]').text()).toBe('2 paths · A–Z')
  })

  it('marks a course the student is enrolled in', async () => {
    world.enrollments = [{ course_id: 'c-rhythm', status: 'active' }]
    const { view } = await openDiscover()

    const cards = view.findAll('[data-test="catalog-card"]')
    expect(cards[2].get('[data-test="catalog-badge"]').text()).toBe('In Learning')
    expect(cards[0].find('[data-test="catalog-badge"]').exists()).toBe(false)
  })

  it('lists rows on a phone and tiles in three columns on a desktop', async () => {
    const phone = await openDiscover()
    expect(phone.view.get('[data-test="catalog-card"]').attributes('data-layout')).toBe('row')

    mockViewport(1280)
    const desktop = await openDiscover()
    expect(desktop.view.get('[data-test="catalog-card"]').attributes('data-layout')).toBe('tile')
    expect(desktop.view.get('[data-test="discover-items"]').classes()).toContain('lg:grid-cols-3')
  })

  it('shows the app language as a removable chip on a bare Discover', async () => {
    const { view, router } = await openDiscover('/courses')

    expect(view.findAll('[data-test="filter-chip"]').map((chip) => chip.text())).toEqual(['English'])
    await view.get('[data-test="filter-chip"] button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({})
    expect(view.find('[data-test="filter-chip"]').exists()).toBe(false)
  })

  it('clears every filter but keeps the search', async () => {
    const { view, router } = await openDiscover('/courses?q=blues&level=beginner&language=en')

    await view.get('[data-test="clear-all-filters"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ q: 'blues' })
  })

  it('says nothing matches, naming the search and filters, and offers to clear the filters', async () => {
    world.courses = []
    world.paths = []
    const { view, router } = await openDiscover('/courses?q=shuffle&level=advanced')

    const noMatches = view.get('[data-test="discover-no-matches"]')
    expect(noMatches.text()).toContain('No courses match')
    expect(noMatches.text()).toContain('“shuffle”')
    expect(noMatches.text()).toContain('Advanced')

    await noMatches.get('[data-test="discover-clear-filters"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ q: 'shuffle' })
  })

  it('points to the other segment when it has matches', async () => {
    world.courses = []
    world.paths = [PATHS[0]]
    const { view, router } = await openDiscover('/courses?q=shuffle')

    expect(view.get('[data-test="discover-other-matches"]').text()).toContain('1 path matches')
    await view.get('[data-test="discover-show-other"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('path-catalog')
    expect(router.currentRoute.value.query).toEqual({ q: 'shuffle' })
  })

  it('does not point to the other segment when it has no matches either', async () => {
    world.courses = []
    world.paths = []
    const { view } = await openDiscover('/courses?q=shuffle')

    expect(view.find('[data-test="discover-other-matches"]').exists()).toBe(false)
  })

  it('says the catalog failed in place, keeping the search, and tries again', async () => {
    world.courses = 'fail'
    const { view } = await openDiscover()

    expect(view.get('[data-test="inline-notice"]').text()).toContain('did not load')
    expect(view.find('input[type="search"]').exists()).toBe(true)

    world.courses = COURSES
    await view.get('[data-test="retry"]').trigger('click')
    await flushPromises()
    expect(titles(view)).toHaveLength(3)
  })
  it('comes back from a detail to the same list, as far down as it was', async () => {
    world.courses = Array.from({ length: 45 }, (_, i) => course(`c-${i}`, `Course ${String(i).padStart(2, '0')}`))
    const first = await openDiscover('/courses?q=course')
    await first.view.findComponent({ name: 'ListEndLoader' }).vm.$emit('load')
    await flushPromises()
    expect(titles(first.view)).toHaveLength(40)
    window.scrollY = 900
    await first.router.push({ name: 'course-detail', params: { courseId: 'c-30' } })
    first.view.unmount()

    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const back = await openDiscover('/courses?q=course&returnFromCourse=c-30')

    expect(titles(back.view)).toHaveLength(40)
    expect(scrollTo).toHaveBeenCalledWith(0, 900)
    expect(back.router.currentRoute.value.query).toEqual({ q: 'course' })
  })
  describe('after the browser’s Back button', () => {
    const many = () => Array.from({ length: 45 }, (_, i) => course(`c-${i}`, `Course ${String(i).padStart(2, '0')}`))
    afterEach(() => window.history.replaceState(null, ''))

    it('also returns to the place in the list', async () => {
      world.courses = many()
      saveCatalogReturn('courses', { itemId: 'c-30', query: { q: 'course' }, loadedCount: 40, scrollY: 900 })
      window.history.replaceState({ forward: '/courses/c-30' }, '')
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      const { view } = await openDiscover('/courses?q=course')

      expect(titles(view)).toHaveLength(40)
      expect(scrollTo).toHaveBeenCalledWith(0, 900)
    })

    it('starts fresh when the detail was opened from somewhere else', async () => {
      world.courses = many()
      saveCatalogReturn('courses', { itemId: 'c-30', query: { q: 'course' }, loadedCount: 40, scrollY: 900 })
      window.history.replaceState({ forward: '/courses/c-9' }, '')
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      const { view } = await openDiscover('/courses?q=course')

      expect(titles(view)).toHaveLength(20)
      expect(scrollTo).not.toHaveBeenCalled()
    })
  })
})
