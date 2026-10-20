import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
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

import ContentListView from '@/features/teacher/views/ContentListView.vue'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { mockViewport } from '@/shared/testUtils/viewport'

function lesson(id: string, overrides: Record<string, unknown> = {}) {
  return {
    content_node_id: id,
    title: `Lesson ${id}`,
    content_type: 'video',
    languages: [{ code: 'en', name: 'English' }],
    instrument_ids: ['instrument-guitar'],
    latest_published_version: null,
    has_unpublished_changes: true,
    ...overrides,
  }
}

function answer(lessons: unknown[]) {
  GET.mockImplementation((path: string) => {
    if (path === '/content-nodes') return Promise.resolve({ data: { items: lessons, total: lessons.length, limit: 20, offset: 0 } })
    if (path === '/instruments') return Promise.resolve({ data: [makeFrettedInstrument({ names: { en: 'Guitar' } })] })
    return Promise.resolve({ data: [] })
  })
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/teach/lessons', name: 'teacher-content', component: ContentListView }],
  })
  await router.push('/teach/lessons')
  await router.isReady()
  const wrapper = mount(ContentListView, {
    global: { plugins: [createPinia(), router], stubs: { RouterLink: RouterLinkStub } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  GET.mockReset()
  answer([])
  window.localStorage.clear()
  currentUser.profile.role = 'teacher'
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  mockViewport(390)
})
afterEach(() => vi.unstubAllGlobals())

describe('ContentListView', () => {
  it('shows a permission-denied state for a student instead of the list', async () => {
    currentUser.profile.role = 'student'
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  it('offers a new lesson from the title', async () => {
    const wrapper = await mountView()

    expect(wrapper.get('h1').text()).toBe('Lessons')
    expect(wrapper.get('[data-test="authoring-new"]').findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'teacher-content-new',
    })
  })

  it('lists each lesson with its thumbnail, type, instrument, language and status, opening its editor', async () => {
    answer([lesson('c-1', { title: 'Open chords', thumbnail_url: 'https://cdn/x.png', latest_published_version: 3, has_unpublished_changes: false })])
    const wrapper = await mountView()

    expect(wrapper.get('[data-test="authoring-row-title"]').text()).toBe('Open chords')
    expect(wrapper.get('[data-test="authoring-row-meta"]').text()).toBe('Video · Guitar · English')
    expect(wrapper.get('[data-test="authoring-row-status"]').text()).toBe('Published · v3')
    expect(wrapper.get('img').attributes('src')).toBe('https://cdn/x.png')
    const links = wrapper
      .findAllComponents(RouterLinkStub)
      .map((link) => link.props('to'))
      .filter((to) => typeof to === 'object' && 'name' in to && to.name === 'teacher-content-edit')
    expect(links).toEqual([{ name: 'teacher-content-edit', params: { id: 'c-1' } }])
  })

  it('shows a placeholder for a lesson without a thumbnail', async () => {
    answer([lesson('c-1')])
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="authoring-row-status"]').text()).toBe('Draft')
  })

  it('offers the lesson status chips', async () => {
    const wrapper = await mountView()

    expect(wrapper.findAll('[data-test="status-chips"] button').map((chip) => chip.text())).toEqual([
      'All',
      'Drafts',
      'Published',
      'Unpublished changes',
    ])
  })

  it('offers the Lessons filters: type, level, instrument, language, skills, concepts and author', async () => {
    const wrapper = await mountView()

    await wrapper.get('[data-test="authoring-filters-button"] button').trigger('click')

    expect(wrapper.findAll('[data-test^="filter-group-"]').map((group) => group.attributes('data-test'))).toEqual([
      'filter-group-type',
      'filter-group-level',
      'filter-group-instrument',
      'filter-group-language',
      'filter-group-skills',
      'filter-group-concepts',
      'filter-group-author',
    ])
  })
})
