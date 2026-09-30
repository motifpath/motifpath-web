import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']
type UserRef = components['schemas']['UserRef']

const library = {
  paths: ref<LearningPath[]>([]),
  total: ref(0),
  isLoading: ref(false),
  isLoadingMore: ref(false),
  error: ref(false),
  loadMoreError: ref(false),
  hasMore: ref(false),
  sort: ref<'title' | 'updated'>('title'),
  status: ref<'draft' | 'published' | null>(null),
  filters: reactive({
    levels: [] as string[],
    skillIds: [] as string[],
    conceptIds: [] as string[],
    teacher: null as UserRef | null,
    instrumentId: null as string | null,
    language: null as string | null,
  }),
  searchText: ref(''),
  hasActiveFilters: ref(false),
  clearFilters: vi.fn(),
  retry: vi.fn(),
  loadMore: vi.fn(),
}
vi.mock('@/features/teacher/composables/useLearningPathLibrary', () => ({
  useLearningPathLibrary: () => library,
}))

vi.mock('@/shared/composables/useListSkills', () => ({
  useListSkills: () => ({ skills: ref([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))
vi.mock('@/shared/composables/useListConcepts', () => ({
  useListConcepts: () => ({ concepts: ref([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))
vi.mock('@/shared/composables/useCourseCreators', () => ({
  useCourseCreators: () => ({ creators: ref([]), nameQuery: ref(''), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))
vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => ({
    instruments: ref([{ instrument_id: 'i-guitar', names: { en: 'Guitar' }, languages: ['en'] }]),
    isLoading: ref(false),
    error: ref(false),
    retry: vi.fn(),
  }),
}))

const tomas: UserRef = { user_id: 'u-tomas', display_name: 'Tomás Ribeiro' }
const currentUser = reactive({
  profile: { role: 'teacher' as 'student' | 'teacher' | 'admin', ...tomas },
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

import CourseFilters from '@/shared/components/CourseFilters.vue'
import PathListView from '@/features/teacher/views/PathListView.vue'

function learningPath(overrides: Partial<LearningPath> = {}): LearningPath {
  return {
    learning_path_id: 'lp-1',
    teacher: tomas,
    title: 'Open chords',
    summary: 'Your first five chords, cleanly.',
    language: 'en',
    status: 'published',
    level: 'beginner',
    items: [
      { position: 1, content_node_id: 'n-1', title: 'E major' },
      { position: 2, content_node_id: 'n-2', title: 'A minor' },
    ] as LearningPath['items'],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    instrument_ids: ['i-guitar'],
    ...overrides,
  }
}

function mockMatchMedia(compact: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: compact,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function mountView() {
  return mount(PathListView, {
    global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('PathListView', () => {
  beforeEach(() => {
    library.paths.value = [learningPath()]
    library.total.value = 1
    library.isLoading.value = false
    library.error.value = false
    library.hasActiveFilters.value = false
    library.status.value = null
    Object.assign(library.filters, { teacher: null, language: null, instrumentId: null })
    currentUser.profile.role = 'teacher'
    vi.clearAllMocks()
    mockMatchMedia(false)
  })

  it('shows a permission-denied state for a student instead of the list', () => {
    currentUser.profile.role = 'student'

    expect(mountView().find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  it('shows a loading state, then an error state whose retry reloads', async () => {
    library.isLoading.value = true
    const wrapper = mountView()
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)

    library.isLoading.value = false
    library.error.value = true
    await flushPromises()
    await wrapper.get('[data-test="retry"]').trigger('click')
    expect(library.retry).toHaveBeenCalled()
  })

  it('shows an empty state with a link to create the first learning path', () => {
    library.paths.value = []

    const empty = mountView().get('[data-test="empty"]')

    expect(empty.findComponent(RouterLinkStub).props('to')).toEqual({ name: 'teacher-path-new' })
  })

  it('offers to clear the filters when they match nothing', async () => {
    library.paths.value = []
    library.hasActiveFilters.value = true

    await mountView().get('[data-test="clear-filters"]').trigger('click')

    expect(library.clearFilters).toHaveBeenCalled()
  })

  it('shows each path on the shared card with its status, instruments and lesson count', () => {
    library.paths.value = [learningPath(), learningPath({ learning_path_id: 'lp-2', title: 'Blues shuffle', status: 'draft' })]

    const cards = mountView().findAll('[data-test="learning-path-row"]')

    expect(cards[0]!.get('[data-test="course-card-label"]').text()).toBe('Path')
    expect(cards[0]!.get('[data-test="course-byline"]').text()).toContain('Tomás Ribeiro')
    expect(cards[0]!.get('[data-test="course-lessons"]').text()).toBe('2 lessons')
    expect(cards[0]!.get('[data-test="path-status"]').text()).toBe('Published')
    expect(cards[0]!.get('[data-test="path-instruments"]').text()).toBe('Guitar')
    expect(cards[1]!.get('[data-test="path-status"]').text()).toBe('Draft')
  })

  it("opens a path's editor from its card, and offers no publish control there", () => {
    const wrapper = mountView()

    const edit = wrapper.get('[data-test="edit-path"]').findComponent(RouterLinkStub)
    expect(edit.props('to')).toEqual({ name: 'teacher-path-edit', params: { id: 'lp-1' } })
    expect(wrapper.find('[data-test="publish"]').exists()).toBe(false)
  })

  it('offers a new learning path', () => {
    const link = mountView()
      .findAllComponents(RouterLinkStub)
      .find((l) => l.attributes('data-test') === 'new-learning-path')

    expect(link?.props('to')).toEqual({ name: 'teacher-path-new' })
  })

  it('switches the status tab, and back to every status', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="status-tab-draft"]').trigger('click')
    expect(library.status.value).toBe('draft')

    await wrapper.get('[data-test="status-tab-all"]').trigger('click')
    expect(library.status.value).toBeNull()
  })

  it("binds the language and instrument filters, and offers the library's creators", () => {
    const filters = mountView().getComponent(CourseFilters)

    expect(filters.props('languageFilter')).toBe(true)
    expect(filters.props('instrumentFilter')).toBe(true)
    expect(filters.props('teacherScope')).toBe('path-library')
  })

  it('filters by the creator picked, so an admin can manage another author\'s paths', async () => {
    currentUser.profile.role = 'admin'
    const wrapper = mountView()

    wrapper.getComponent(CourseFilters).vm.$emit('update:teacher', { user_id: 'u-carol', display_name: 'Carol Dias' })
    await flushPromises()

    expect(library.filters.teacher).toEqual({ user_id: 'u-carol', display_name: 'Carol Dias' })
    expect(wrapper.find('[data-test="path-only-mine"]').exists()).toBe(false)
  })

  it('offers the next page when more paths remain', async () => {
    library.total.value = 2

    await mountView().get('[data-test="load-more"]').trigger('click')

    expect(library.loadMore).toHaveBeenCalled()
  })
})
