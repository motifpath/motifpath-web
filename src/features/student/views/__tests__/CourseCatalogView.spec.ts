import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type CourseCatalogEntry = components['schemas']['CourseCatalogEntry']
type CourseEnrollment = components['schemas']['CourseEnrollment']

const catalog = {
  courses: ref<CourseCatalogEntry[]>([]),
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
  }),
  searchText: ref(''),
  hasActiveFilters: ref(false),
  clearFilters: vi.fn(),
  retry: vi.fn(),
  loadMore: vi.fn(),
}
vi.mock('@/features/student/composables/useCourseCatalog', () => ({
  useCourseCatalog: () => catalog,
}))

const enrollments = { enrollments: ref<CourseEnrollment[]>([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }
vi.mock('@/features/student/composables/useMyCourseEnrollments', () => ({
  useMyCourseEnrollments: () => enrollments,
}))

const enrollInCourse = vi.fn()
vi.mock('@/features/student/composables/useEnrollInCourse', () => ({
  useEnrollInCourse: () => ({ enrollInCourse }),
}))

const skills = ref([
  { skill_id: 'chords', name: 'chords', parent_id: null },
  { skill_id: 'triads', name: 'triads', parent_id: 'chords' },
])
vi.mock('@/shared/composables/useListSkills', () => ({
  useListSkills: () => ({ skills, isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))
vi.mock('@/shared/composables/useListConcepts', () => ({
  useListConcepts: () => ({ concepts: ref([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))

vi.mock('@/shared/composables/useCourseCreators', () => ({
  useCourseCreators: () => ({ creators: ref([]), nameQuery: ref(''), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))

const toast = { success: vi.fn(), error: vi.fn() }
vi.mock('@/shared/composables/useToast', () => ({
  useToast: () => toast,
}))

import CourseCatalogView from '@/features/student/views/CourseCatalogView.vue'

function course(overrides: Partial<CourseCatalogEntry> = {}): CourseCatalogEntry {
  return {
    course_id: 'c-1',
    title: 'Fingerstyle journey',
    summary: 'From first arpeggios to full arrangements.',
    level: 'beginner',
    created_by: { user_id: 'teacher-1', display_name: 'Bob Martins' },
    status: 'published',
    published_at: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

function enrollment(overrides: Partial<CourseEnrollment> = {}): CourseEnrollment {
  return {
    course_enrollment_id: 'e-1',
    student: { user_id: 'st-1', display_name: 'Alice Souza' },
    course_id: 'c-1',
    course_title: 'Fingerstyle journey',
    course_version_number: 1,
    status: 'active',
    active_checkpoint_student_path_id: 'sp-1',
    active_checkpoint_position: 1,
    enrolled_at: '2026-09-02T00:00:00Z',
    ...overrides,
  }
}

function mountView() {
  return mount(CourseCatalogView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('CourseCatalogView', () => {
  beforeEach(() => {
    catalog.courses.value = []
    catalog.total.value = 0
    catalog.isLoading.value = false
    catalog.error.value = false
    catalog.hasActiveFilters.value = false
    catalog.searchText.value = ''
    Object.assign(catalog.filters, { levels: [], skillIds: [], conceptIds: [], teacher: null })
    enrollments.enrollments.value = []
    vi.clearAllMocks()
  })

  it('shows a loading state while the catalog loads', () => {
    catalog.isLoading.value = true

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('shows an error state whose retry reloads the catalog', async () => {
    catalog.error.value = true

    await mountView().get('[data-test="retry"]').trigger('click')

    expect(catalog.retry).toHaveBeenCalled()
  })

  it('explains an empty catalog when no filters are active', () => {
    const wrapper = mountView()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="no-matches"]').exists()).toBe(false)
  })

  it('offers to clear the filters when they match nothing', async () => {
    catalog.hasActiveFilters.value = true

    const wrapper = mountView()
    await wrapper.get('[data-test="no-matches"] [data-test="clear-filters"]').trigger('click')

    expect(catalog.clearFilters).toHaveBeenCalled()
  })

  it('lists each course with its title, summary and level', () => {
    catalog.courses.value = [course(), course({ course_id: 'c-2', title: 'Jazz voicings', level: 'advanced' })]
    catalog.total.value = 2

    const cards = mountView().findAll('[data-test="course-card"]')

    expect(cards).toHaveLength(2)
    expect(cards[0]!.text()).toContain('Fingerstyle journey')
    expect(cards[0]!.text()).toContain('From first arpeggios to full arrangements.')
    expect(cards[0]!.text()).toContain('Beginner')
    expect(cards[1]!.text()).toContain('Advanced')
  })

  it('binds the search box to the catalog search text', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="catalog-search"]').setValue('jazz')

    expect(catalog.searchText.value).toBe('jazz')
  })

  it('toggles a level filter on and off', async () => {
    const wrapper = mountView()
    const chip = wrapper.get('[data-test="level-filter-intermediate"]')

    await chip.trigger('click')
    expect(catalog.filters.levels).toEqual(['intermediate'])
    expect(chip.attributes('aria-pressed')).toBe('true')

    await chip.trigger('click')
    expect(catalog.filters.levels).toEqual([])
  })

  it('filters by the most specific skills picked, not their ancestors too', async () => {
    const wrapper = mountView()
    const picker = wrapper.findAllComponents({ name: 'SkillConceptTreePicker' })[0]!

    picker.vm.$emit('update:selectedIds', ['chords', 'triads'])
    await flushPromises()

    expect(catalog.filters.skillIds).toEqual(['triads'])
  })

  it('names each course\'s teacher on its card', () => {
    catalog.courses.value = [course()]
    catalog.total.value = 1

    expect(mountView().get('[data-test="course-teacher"]').text()).toContain('Bob Martins')
  })

  it('filters by the teacher picked in the teacher filter, and clears it again', async () => {
    const wrapper = mountView()
    const picker = wrapper.getComponent({ name: 'TeacherFilterPicker' })

    picker.vm.$emit('update:modelValue', { user_id: 'teacher-2', display_name: 'Carol Dias' })
    await flushPromises()
    expect(catalog.filters.teacher).toEqual({ user_id: 'teacher-2', display_name: 'Carol Dias' })

    picker.vm.$emit('update:modelValue', null)
    await flushPromises()
    expect(catalog.filters.teacher).toBeNull()
  })

  it('narrows the catalog to one course\'s teacher and shows them in the teacher filter', async () => {
    catalog.courses.value = [course()]
    catalog.total.value = 1
    const wrapper = mountView()

    await wrapper.get('[data-test="more-from-teacher"]').trigger('click')

    expect(catalog.filters.teacher).toEqual({ user_id: 'teacher-1', display_name: 'Bob Martins' })
    expect(wrapper.getComponent({ name: 'TeacherFilterPicker' }).props('modelValue')).toEqual({
      user_id: 'teacher-1',
      display_name: 'Bob Martins',
    })
  })

  it('enrolls in a course and then marks it as enrolled', async () => {
    catalog.courses.value = [course()]
    catalog.total.value = 1
    enrollInCourse.mockResolvedValueOnce({ outcome: 'enrolled', enrollment: enrollment() })
    const wrapper = mountView()

    await wrapper.get('[data-test="enroll"]').trigger('click')
    await flushPromises()

    expect(enrollInCourse).toHaveBeenCalledWith('c-1')
    expect(toast.success).toHaveBeenCalled()
    expect(wrapper.find('[data-test="enroll"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="enrolled"]').exists()).toBe(true)
  })

  it('treats an existing enrollment reported by the server as enrolled, not as an error', async () => {
    catalog.courses.value = [course()]
    catalog.total.value = 1
    enrollInCourse.mockResolvedValueOnce({ outcome: 'already-enrolled' })
    const wrapper = mountView()

    await wrapper.get('[data-test="enroll"]').trigger('click')
    await flushPromises()

    expect(toast.error).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="enrolled"]').exists()).toBe(true)
  })

  it('shows courses the student is already actively enrolled in as enrolled', () => {
    catalog.courses.value = [course(), course({ course_id: 'c-2', title: 'Jazz voicings' })]
    catalog.total.value = 2
    enrollments.enrollments.value = [enrollment(), enrollment({ course_id: 'c-2', status: 'abandoned' })]

    const cards = mountView().findAll('[data-test="course-card"]')

    expect(cards[0]!.find('[data-test="enrolled"]').exists()).toBe(true)
    expect(cards[1]!.find('[data-test="enroll"]').exists()).toBe(true)
  })

  it('reports an enrollment failure and lets the student try again', async () => {
    catalog.courses.value = [course()]
    catalog.total.value = 1
    enrollInCourse.mockRejectedValueOnce(new Error('Course is not open for enrollment'))
    const wrapper = mountView()

    await wrapper.get('[data-test="enroll"]').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Course is not open for enrollment')
    expect(wrapper.get('[data-test="enroll"]').attributes('disabled')).toBeUndefined()
  })

  it('disables the enroll control while the enrollment is in flight', async () => {
    catalog.courses.value = [course()]
    catalog.total.value = 1
    enrollInCourse.mockReturnValueOnce(new Promise(() => {}))
    const wrapper = mountView()

    await wrapper.get('[data-test="enroll"]').trigger('click')

    expect(wrapper.get('[data-test="enroll"]').attributes('disabled')).toBeDefined()
  })

  it('offers the next page when more courses remain', async () => {
    catalog.courses.value = [course()]
    catalog.total.value = 5

    await mountView().get('[data-test="load-more"]').trigger('click')

    expect(catalog.loadMore).toHaveBeenCalled()
  })
})
