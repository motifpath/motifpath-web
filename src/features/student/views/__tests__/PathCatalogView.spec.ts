import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type PathCatalogEntry = components['schemas']['PathCatalogEntry']
type StudentPath = components['schemas']['StudentPath']

const routeQuery: Record<string, string> = {}
const push = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    useRoute: () => ({ query: routeQuery }),
    useRouter: () => ({ push, resolve: () => ({ name: 'not-found', params: {} }) }),
    onBeforeRouteLeave: vi.fn(),
  }
})

const catalog = {
  paths: ref<PathCatalogEntry[]>([]),
  total: ref(0),
  isLoading: ref(false),
  isLoadingMore: ref(false),
  error: ref(false),
  loadMoreError: ref(false),
  hasMore: ref(false),
  filters: reactive({
    levels: [] as string[],
    skillIds: [] as string[],
    conceptIds: [] as string[],
    teacher: null as { user_id: string; display_name: string } | null,
    instrumentId: null as string | null,
    language: null as string | null,
  }),
  searchText: ref(''),
  hasActiveFilters: ref(false),
  clearFilters: vi.fn(),
  retry: vi.fn(),
  loadMore: vi.fn(),
}
const catalogStartedWith = vi.fn()
vi.mock('@/features/student/composables/usePathCatalog', () => ({
  usePathCatalog: (initial: unknown) => {
    catalogStartedWith(initial)
    return catalog
  },
}))

const held = { paths: ref<StudentPath[]>([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }
vi.mock('@/features/student/composables/useMyStandalonePaths', () => ({
  useMyStandalonePaths: () => held,
}))

const enrollInLearningPath = vi.fn()
vi.mock('@/features/student/composables/useEnrollInLearningPath', () => ({
  useEnrollInLearningPath: () => ({ enrollInLearningPath }),
}))

vi.mock('@/shared/composables/useListKnowledgeNodes', () => ({
  useListKnowledgeNodes: () => ({ nodes: ref([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))
vi.mock('@/shared/composables/useListKnowledgeEdges', () => ({
  useListKnowledgeEdges: () => ({ edges: ref([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))
vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => ({
    instruments: ref([{ instrument_id: 'i-guitar', names: { en: 'Guitar' }, languages: ['en'] }]),
    isLoading: ref(false),
    error: ref(false),
    retry: vi.fn(),
  }),
}))
vi.mock('@/shared/composables/useCourseCreators', () => ({
  useCourseCreators: () => ({ creators: ref([]), nameQuery: ref(''), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))

const toast = { success: vi.fn(), error: vi.fn() }
vi.mock('@/shared/composables/useToast', () => ({
  useToast: () => toast,
}))

import { saveCatalogReturn } from '@/features/student/utils/catalogReturn'
import CourseFilters from '@/shared/components/CourseFilters.vue'
import PathCatalogView from '@/features/student/views/PathCatalogView.vue'

function entry(overrides: Partial<PathCatalogEntry> = {}): PathCatalogEntry {
  return {
    learning_path_id: 'lp-1',
    title: 'Open chords',
    summary: 'Your first five chords, cleanly.',
    level: 'beginner',
    language: 'en',
    created_by: { user_id: 'teacher-1', display_name: 'Bob Martins' },
    instrument_ids: ['i-guitar'],
    lesson_count: 4,
    ...overrides,
  }
}

function heldCopy(overrides: Partial<StudentPath> = {}): StudentPath {
  return {
    student_path_id: 'sp-1',
    student: { user_id: 'st-1', display_name: 'Alice Souza' },
    source_template_id: 'lp-1',
    title: 'Open chords',
    assigned_by: { user_id: 'st-1', display_name: 'Alice Souza' },
    assigned_at: '2026-09-01T00:00:00Z',
    archived_at: null,
    source_course_enrollment_id: null,
    course_checkpoint_position: null,
    lesson_count: 4,
    completed_count: 0,
    ...overrides,
  }
}

function mountView() {
  return mount(PathCatalogView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('PathCatalogView', () => {
  beforeEach(() => {
    catalog.paths.value = [entry()]
    catalog.total.value = 1
    catalog.isLoading.value = false
    catalog.error.value = false
    catalog.hasActiveFilters.value = false
    catalog.filters.teacher = null
    held.paths.value = []
    for (const key of Object.keys(routeQuery)) delete routeQuery[key]
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('sits under Discover: the title, then the Courses | Paths switch', () => {
    const wrapper = mountView()

    expect(wrapper.get('h1').text()).toBe('Discover')
    expect(wrapper.findComponent({ name: 'DiscoverSwitch' }).exists()).toBe(true)
  })

  it('lists each published path on a card labeled as a path', () => {
    const wrapper = mountView()

    const card = wrapper.get('[data-test="course-card"]')
    expect(card.get('[data-test="course-card-label"]').text()).toBe('Path')
    expect(card.text()).toContain('Open chords')
    expect(card.get('[data-test="course-byline"]').text()).toContain('Bob Martins')
    expect(card.get('[data-test="course-lessons"]').text()).toBe('4 lessons')
    expect(card.find('[data-test="course-checkpoints"]').exists()).toBe(false)
    expect(card.get('[data-test="path-instruments"]').text()).toBe('Guitar')
  })

  it("offers the path catalog's teachers in the teacher filter", () => {
    const wrapper = mountView()

    expect(wrapper.getComponent(CourseFilters).props('teacherScope')).toBe('path-catalog')
  })

  it('links every card to its detail page, remembering it came from the catalog', () => {
    const wrapper = mountView()

    const details = wrapper.get('[data-test="details"]').findComponent(RouterLinkStub)
    expect(details.props('to')).toEqual({
      name: 'path-detail',
      params: { learningPathId: 'lp-1' },
      query: { fromCatalog: 'true' },
    })
  })

  it("opens a path's details from its thumbnail too", () => {
    const link = mountView().get('[data-test="course-card-thumbnail-link"]').findComponent(RouterLinkStub)

    expect(link.props('to')).toEqual({ name: 'path-detail', params: { learningPathId: 'lp-1' }, query: { fromCatalog: 'true' } })
  })

  it("narrows the catalog to one path's teacher", async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="more-from-teacher"]').trigger('click')

    expect(catalog.filters.teacher).toEqual({ user_id: 'teacher-1', display_name: 'Bob Martins' })
  })

  it('enrolls and takes the learner to the path, which is now their current one', async () => {
    enrollInLearningPath.mockResolvedValueOnce(heldCopy())
    const wrapper = mountView()

    await wrapper.get('[data-test="enroll"]').trigger('click')
    await flushPromises()

    expect(enrollInLearningPath).toHaveBeenCalledWith('lp-1')
    expect(toast.success).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('offers to continue a path the learner already holds', async () => {
    held.paths.value = [heldCopy()]
    enrollInLearningPath.mockResolvedValueOnce(heldCopy())
    const wrapper = mountView()

    const action = wrapper.get('[data-test="enroll"]')
    expect(action.text()).toBe('Continue')
    await action.trigger('click')
    await flushPromises()

    expect(toast.success).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('reports a failed enrollment and stays on the catalog', async () => {
    enrollInLearningPath.mockRejectedValueOnce(new Error('Learning path not found'))
    const wrapper = mountView()

    await wrapper.get('[data-test="enroll"]').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Learning path not found')
    expect(push).not.toHaveBeenCalled()
  })

  it('shows the loading, error, empty and no-matches states', async () => {
    catalog.isLoading.value = true
    const wrapper = mountView()
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)

    catalog.isLoading.value = false
    catalog.error.value = true
    await flushPromises()
    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)

    catalog.error.value = false
    catalog.paths.value = []
    await flushPromises()
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)

    catalog.hasActiveFilters.value = true
    await flushPromises()
    await wrapper.get('[data-test="clear-filters"]').trigger('click')
    expect(catalog.clearFilters).toHaveBeenCalled()
  })

  it('starts from the saved filters when the learner comes back from a path', () => {
    const filters = { levels: [], skillIds: [], conceptIds: [], teacher: null, instrumentId: null, language: null }
    saveCatalogReturn('paths', { itemId: 'lp-1', filters, searchText: 'chords', loadedCount: 1, scrollY: 0 })
    routeQuery.returnFromPath = 'lp-1'

    mountView()

    expect(catalogStartedWith).toHaveBeenCalledWith({ ...filters, searchText: 'chords' })
  })
})
