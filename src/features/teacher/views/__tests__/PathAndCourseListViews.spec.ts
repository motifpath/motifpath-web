import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Component, reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

const currentUser = reactive({
  profile: { user_id: 'u-teacher', role: 'teacher' as 'student' | 'teacher' | 'admin', display_name: 'Bob Ferreira' },
})
vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    isLoaded: { value: true },
    isSignedIn: { value: true },
    getToken: async () => 'jwt',
    signOut: vi.fn(async () => {}),
    displayInitial: { value: 'G' },
  }),
}))

import CourseListView from '@/features/teacher/views/CourseListView.vue'
import PathListView from '@/features/teacher/views/PathListView.vue'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { mockViewport } from '@/shared/testUtils/viewport'

const path = {
  learning_path_id: 'p-1',
  title: 'Strumming',
  status: 'published',
  level: 'beginner',
  language: 'en',
  instrument_ids: ['instrument-guitar'],
  items: [{}, {}, {}],
  thumbnail_url: 'https://cdn/p.png',
}

const course = {
  course_id: 'c-1',
  title: 'Guitar foundations',
  status: 'published',
  has_unpublished_changes: true,
  level: 'beginner',
  language: 'en',
  instrument_ids: ['instrument-guitar'],
  lesson_count: 44,
  checkpoint_count: 4,
}

const LIST_PATHS = ['/learning-paths', '/courses']

function answer(listPath: string, items: unknown[]) {
  GET.mockImplementation((requested: string) => {
    if (requested === listPath) return Promise.resolve({ data: { items, total: items.length, limit: 20, offset: 0 } })
    if (LIST_PATHS.includes(requested)) return Promise.resolve({ data: { items: [], total: 0, limit: 20, offset: 0 } })
    if (requested === '/instruments') return Promise.resolve({ data: [makeFrettedInstrument({ names: { en: 'Guitar' } })] })
    return Promise.resolve({ data: [] })
  })
}

async function mountView(view: Component, routeName: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/teach/list', name: routeName, component: view }],
  })
  await router.push('/teach/list')
  await router.isReady()
  const wrapper = mount(view, { global: { plugins: [createPinia(), router], stubs: { RouterLink: RouterLinkStub } } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  GET.mockReset()
  // A request still in flight from the previous test gets the same shapes as this one's.
  answer('/learning-paths', [])
  window.localStorage.clear()
  currentUser.profile.role = 'teacher'
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  mockViewport(390)
})
afterEach(() => vi.unstubAllGlobals())

describe('PathListView', () => {
  it('shows a permission-denied state for a student instead of the list', async () => {
    currentUser.profile.role = 'student'
    answer('/learning-paths', [])
    const wrapper = await mountView(PathListView, 'teacher-paths')

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  it('lists each path with its thumbnail, level, language, instrument, lessons and status', async () => {
    answer('/learning-paths', [path])
    const wrapper = await mountView(PathListView, 'teacher-paths')

    expect(wrapper.get('h1').text()).toBe('Paths')
    expect(wrapper.get('[data-test="authoring-row-title"]').text()).toBe('Strumming')
    expect(wrapper.get('[data-test="authoring-row-meta"]').text()).toBe('Beginner · English · Guitar · 3 lessons')
    expect(wrapper.get('[data-test="authoring-row-status"]').text()).toBe('Published')
    expect(wrapper.get('img').attributes('src')).toBe('https://cdn/p.png')
    const links = wrapper
      .findAllComponents(RouterLinkStub)
      .map((link) => link.props('to'))
      .filter((to) => typeof to === 'object' && 'name' in to && to.name === 'teacher-path-edit')
    expect(links).toEqual([{ name: 'teacher-path-edit', params: { id: 'p-1' } }])
  })

  it('offers All, Drafts and Published, and a new path', async () => {
    answer('/learning-paths', [])
    const wrapper = await mountView(PathListView, 'teacher-paths')

    expect(wrapper.findAll('[data-test="status-chips"] button').map((chip) => chip.text())).toEqual(['All', 'Drafts', 'Published'])
    expect(wrapper.get('[data-test="authoring-new"]').findComponent(RouterLinkStub).props('to')).toEqual({ name: 'teacher-path-new' })
  })
})

describe('CourseListView', () => {
  it('shows a permission-denied state for a student instead of the list', async () => {
    currentUser.profile.role = 'student'
    answer('/courses', [])
    const wrapper = await mountView(CourseListView, 'teacher-courses')

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  it('lists each course with its level, language, instrument, lessons and status', async () => {
    answer('/courses', [course])
    const wrapper = await mountView(CourseListView, 'teacher-courses')

    expect(wrapper.get('h1').text()).toBe('Courses')
    expect(wrapper.get('[data-test="authoring-row-title"]').text()).toBe('Guitar foundations')
    expect(wrapper.get('[data-test="authoring-row-meta"]').text()).toBe('Beginner · English · Guitar · 44 lessons')
    expect(wrapper.get('[data-test="authoring-row-status"]').text()).toBe('Unpublished changes')
    expect(wrapper.find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
    const links = wrapper
      .findAllComponents(RouterLinkStub)
      .map((link) => link.props('to'))
      .filter((to) => typeof to === 'object' && 'name' in to && to.name === 'teacher-course-edit')
    expect(links).toEqual([{ name: 'teacher-course-edit', params: { id: 'c-1' } }])
  })

  it('offers All, Drafts, Published and Retired, and a new course', async () => {
    answer('/courses', [])
    const wrapper = await mountView(CourseListView, 'teacher-courses')

    expect(wrapper.findAll('[data-test="status-chips"] button').map((chip) => chip.text())).toEqual([
      'All',
      'Drafts',
      'Published',
      'Retired',
    ])
    expect(wrapper.get('[data-test="authoring-new"]').findComponent(RouterLinkStub).props('to')).toEqual({ name: 'teacher-course-new' })
  })
})
