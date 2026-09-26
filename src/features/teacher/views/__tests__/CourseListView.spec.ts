import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type CourseCatalogEntry = components['schemas']['CourseCatalogEntry']
type UserRef = components['schemas']['UserRef']

const managed = {
  courses: ref<CourseCatalogEntry[]>([]),
  total: ref(0),
  isLoading: ref(false),
  isLoadingMore: ref(false),
  error: ref(false),
  loadMoreError: ref(false),
  hasMore: ref(false),
  status: ref<'draft' | 'published' | 'retired' | null>(null),
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
vi.mock('@/features/teacher/composables/useManagedCourses', () => ({
  useManagedCourses: () => managed,
}))

const creatorScopes: string[] = []
vi.mock('@/shared/composables/useCourseCreators', () => ({
  useCourseCreators: (scope: string) => {
    creatorScopes.push(scope)
    return {
      creators: ref([]),
      nameQuery: ref(''),
      isLoading: ref(false),
      error: ref(false),
      retry: vi.fn(),
    }
  },
}))
vi.mock('@/shared/composables/useListSkills', () => ({
  useListSkills: () => ({
    skills: ref([]),
    isLoading: ref(false),
    error: ref(false),
    retry: vi.fn(),
  }),
}))
vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => ({
    instruments: ref([{ instrument_id: 'i-guitar', names: { en: 'Guitar' }, languages: ['en'] }]),
    isLoading: ref(false),
    error: ref(false),
    retry: vi.fn(),
  }),
}))
vi.mock('@/shared/composables/useListConcepts', () => ({
  useListConcepts: () => ({
    concepts: ref([]),
    isLoading: ref(false),
    error: ref(false),
    retry: vi.fn(),
  }),
}))

const currentUser = reactive({ profile: { role: 'teacher' as 'student' | 'teacher' | 'admin' } })
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

const tomas: UserRef = { user_id: 'u-tomas', display_name: 'Tomás Ribeiro' }

function course(overrides: Partial<CourseCatalogEntry> = {}): CourseCatalogEntry {
  return {
    course_id: 'c-1',
    title: 'Fingerstyle Foundations',
    summary: 'Fingerpicking from the first pattern.',
    level: 'beginner',
    language: 'en',
    instrument_ids: [],
    created_by: tomas,
    status: 'published',
    published_at: '2026-09-01T00:00:00Z',
    has_unpublished_changes: false,
    ...overrides,
  }
}

function mountView() {
  return mount(CourseListView, {
    global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub, AppBar: true } },
  })
}

describe('CourseListView', () => {
  beforeEach(() => {
    managed.courses.value = []
    managed.total.value = 0
    managed.isLoading.value = false
    managed.error.value = false
    managed.status.value = null
    managed.hasActiveFilters.value = false
    Object.assign(managed.filters, {
      levels: [],
      skillIds: [],
      conceptIds: [],
      teacher: null,
      instrumentId: null,
      language: null,
    })
    currentUser.profile.role = 'teacher'
    creatorScopes.length = 0
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    vi.clearAllMocks()
  })

  it('shows a permission-denied state for a student instead of the list', () => {
    currentUser.profile.role = 'student'

    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="course-row"]').exists()).toBe(false)
  })

  it('shows a loading state, then an error state whose retry reloads', async () => {
    managed.isLoading.value = true
    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)

    managed.isLoading.value = false
    managed.error.value = true
    await mountView().get('[data-test="retry"]').trigger('click')
    expect(managed.retry).toHaveBeenCalled()
  })

  it('explains an empty list when nothing is filtered', () => {
    expect(mountView().find('[data-test="empty"]').exists()).toBe(true)
  })

  it('offers to clear the filters when they match nothing', async () => {
    managed.hasActiveFilters.value = true

    await mountView().get('[data-test="no-matches"] [data-test="clear-filters"]').trigger('click')

    expect(managed.clearFilters).toHaveBeenCalled()
  })

  it('lists each course with its level, status and whether it has unpublished changes', () => {
    managed.courses.value = [
      course(),
      course({ course_id: 'c-2', title: 'Rhythm Basics', has_unpublished_changes: true }),
      course({ course_id: 'c-3', title: 'Draft Course', status: 'draft', published_at: null }),
    ]
    managed.total.value = 3

    const rows = mountView().findAll('[data-test="course-row"]')

    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('Fingerstyle Foundations')
    expect(rows[0]!.text()).toContain('Beginner')
    expect(rows[0]!.get('[data-test="course-status"]').text()).toBe('Published')
    expect(rows[0]!.find('[data-test="unpublished-changes"]').exists()).toBe(false)
    expect(rows[1]!.find('[data-test="unpublished-changes"]').exists()).toBe(true)
    expect(rows[2]!.get('[data-test="course-status"]').text()).toBe('Draft')
  })

  it("opens a course's builder from its row", () => {
    managed.courses.value = [course(), course({ course_id: 'c-2', title: 'Rhythm Basics' })]
    managed.total.value = 2

    const rows = mountView().findAll('[data-test="course-row"]')

    expect(rows.map((row) => row.getComponent(RouterLinkStub).props('to'))).toEqual([
      { name: 'teacher-course-edit', params: { id: 'c-1' } },
      { name: 'teacher-course-edit', params: { id: 'c-2' } },
    ])
  })

  it('offers a new course', () => {
    const link = mountView()
      .findAllComponents(RouterLinkStub)
      .find((l) => l.attributes('data-test') === 'new-course')

    expect(link?.props('to')).toEqual({ name: 'teacher-course-new' })
  })

  it("shows each course's thumbnail, or a placeholder, and its language", () => {
    managed.courses.value = [
      course({ thumbnail_url: 'https://cdn.test/thumbnails/c-1.png' }),
      course({ course_id: 'c-2', language: 'pt_BR' }),
    ]
    managed.total.value = 2

    const rows = mountView().findAll('[data-test="course-row"]')

    expect(rows[0]!.get('img').attributes('src')).toBe('https://cdn.test/thumbnails/c-1.png')
    expect(rows[1]!.find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
    expect(rows[0]!.get('[data-test="course-language"]').text()).toContain('EN')
    expect(rows[1]!.get('[data-test="course-language"]').text()).toContain('PT')
  })

  it('binds the language and instrument filters to the list', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="language-filter"]').setValue('pt_BR')
    await wrapper.get('[data-test="instrument-filter"]').setValue('i-guitar')

    expect(managed.filters.language).toBe('pt_BR')
    expect(managed.filters.instrumentId).toBe('i-guitar')
  })

  it('switches the status tab, and back to every status', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="status-tab-retired"]').trigger('click')
    expect(managed.status.value).toBe('retired')
    expect(wrapper.get('[data-test="status-tab-retired"]').attributes('aria-selected')).toBe('true')

    await wrapper.get('[data-test="status-tab-all"]').trigger('click')
    expect(managed.status.value).toBeNull()
  })

  it("names each course's teacher and offers a teacher filter to an admin", () => {
    currentUser.profile.role = 'admin'
    managed.courses.value = [course()]
    managed.total.value = 1

    const wrapper = mountView()

    expect(wrapper.get('[data-test="course-row"]').text()).toContain('Tomás Ribeiro')
    expect(wrapper.findComponent({ name: 'TeacherFilterPicker' }).exists()).toBe(true)
    expect(creatorScopes).toEqual(['managed'])
  })

  it('offers a teacher no teacher filter, since the list is only their own courses', () => {
    managed.courses.value = [course()]
    managed.total.value = 1

    const wrapper = mountView()

    expect(wrapper.findComponent({ name: 'TeacherFilterPicker' }).exists()).toBe(false)
    expect(wrapper.find('[data-test="course-teacher"]').exists()).toBe(false)
  })

  it('binds the search box and level filters to the list', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="catalog-search"]').setValue('rhythm')
    await wrapper.get('[data-test="level-filter-advanced"]').trigger('click')
    await flushPromises()

    expect(managed.searchText.value).toBe('rhythm')
    expect(managed.filters.levels).toEqual(['advanced'])
  })

  it('offers the next page when more courses remain', async () => {
    managed.courses.value = [course()]
    managed.total.value = 5

    await mountView().get('[data-test="load-more"]').trigger('click')

    expect(managed.loadMore).toHaveBeenCalled()
  })
})
