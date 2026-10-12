import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type CourseDetail = components['schemas']['CourseDetail']
type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']
type StudentPathView = components['schemas']['StudentPathView']

const enrollments = {
  enrollments: ref<CourseEnrollment[]>([]),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useMyCourseEnrollments', () => ({
  useMyCourseEnrollments: () => enrollments,
}))

const standalone = {
  paths: ref<StudentPath[]>([]),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useMyStandalonePaths', () => ({
  useMyStandalonePaths: () => standalone,
}))

const current = {
  data: ref<StudentPathView | null>(null),
  error: ref<'no-path' | 'load-failed' | null>(null),
  isLoading: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useStudentPath', () => ({
  useStudentPath: () => current,
}))

const published = {
  course: ref<CourseDetail | null>(null),
  isLoading: ref(false),
  error: ref(false),
  notFound: ref(false),
  retry: vi.fn(),
}
const usePublishedCourse = vi.fn<(courseId: string) => typeof published>(() => published)
vi.mock('@/features/student/composables/usePublishedCourse', () => ({
  usePublishedCourse: (courseId: string) => usePublishedCourse(courseId),
}))

const setCurrentPath = vi.fn()
vi.mock('@/features/student/composables/useSetCurrentPath', () => ({
  useSetCurrentPath: () => ({ setCurrentPath }),
}))

const toast = { success: vi.fn(), error: vi.fn(), neutral: vi.fn() }
vi.mock('@/shared/composables/useToast', () => ({
  useToast: () => toast,
}))

const push = vi.fn()
const route = { params: { enrollmentId: 'e-1' } }
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => ({ push }) }
})

import {
  makeCurrentPath as currentPath,
  makeEnrollment,
  makeStandalonePath as standalonePath,
} from '@/features/student/testing/learning'
import AppButton from '@/shared/components/AppButton.vue'
import CourseCompletedView from '@/features/student/views/CourseCompletedView.vue'

function finished(overrides: Partial<CourseEnrollment> = {}): CourseEnrollment {
  return makeEnrollment({
    status: 'completed',
    active_checkpoint_position: null,
    active_checkpoint_student_path_id: null,
    course_thumbnail_url: 'https://cdn.example.test/foundations.png',
    ...overrides,
  })
}

function publishedCourse(overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    course_id: 'c-1',
    title: 'Guitar foundations',
    summary: 'Chords, strumming and your first songs.',
    level: 'beginner',
    language: 'en',
    created_by: { user_id: 't-1', display_name: 'Ana Lima' },
    status: 'published',
    published_at: '2026-09-01T00:00:00Z',
    checkpoints: [],
    instrument_ids: [],
    checkpoint_count: 4,
    lesson_count: 44,
    ...overrides,
  }
}

function mountView() {
  return mount(CourseCompletedView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

function linkTo(wrapper: ReturnType<typeof mountView>, selector: string) {
  return wrapper.get(selector).findComponent(RouterLinkStub).props('to')
}

function variantOf(wrapper: ReturnType<typeof mountView>, button: ReturnType<ReturnType<typeof mountView>['get']>) {
  return wrapper.findAllComponents(AppButton).find((b) => b.element === button.element)?.props('variant')
}

describe('CourseCompletedView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.params.enrollmentId = 'e-1'
    enrollments.enrollments.value = []
    enrollments.isLoading.value = false
    enrollments.error.value = false
    standalone.paths.value = []
    standalone.isLoading.value = false
    standalone.error.value = false
    current.data.value = null
    published.course.value = publishedCourse()
    published.error.value = false
  })

  // ── Loading and errors ──────────────────────────────────────────────────

  it('shows a loading state while the enrolments load', () => {
    enrollments.isLoading.value = true

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('waits for the standalone paths too, since they decide the way on', () => {
    enrollments.enrollments.value = [finished()]
    standalone.isLoading.value = true

    const wrapper = mountView()

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="course-completed"]').exists()).toBe(false)
  })

  it.each([
    ['the enrolments', enrollments],
    ['the standalone paths', standalone],
  ])('shows an error whose retry reloads %s when they fail', async (_label, failing) => {
    enrollments.enrollments.value = [finished()]
    failing.error.value = true

    const wrapper = mountView()
    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(failing.retry).toHaveBeenCalled()
  })

  // ── The celebration ─────────────────────────────────────────────────────

  it('says the student finished the course, with its parts and lessons and no date', () => {
    enrollments.enrollments.value = [finished()]

    const wrapper = mountView()
    const card = wrapper.get('[data-test="course-completed"]')

    expect(usePublishedCourse).toHaveBeenCalledWith('c-1')
    expect(card.get('h1').text()).toBe('You finished Guitar foundations')
    expect(card.get('[data-test="course-size"]').text()).toBe('4 parts · 44 lessons')
    expect(card.text()).toContain('What you learned keeps coming back in Practice')
    expect(card.text()).not.toMatch(/2026|Sep/)
    expect(card.get('img').attributes('src')).toBe('https://cdn.example.test/foundations.png')
  })

  it('shows the whole course picture, never cropped', () => {
    enrollments.enrollments.value = [finished()]

    expect(mountView().get('[data-test="course-completed"] img').classes()).toContain('object-contain')
  })

  it('counts only the parts when the published course cannot be read', () => {
    enrollments.enrollments.value = [finished()]
    published.course.value = null
    published.error.value = true

    const wrapper = mountView()

    expect(wrapper.get('[data-test="course-size"]').text()).toBe('4 parts')
    expect(wrapper.find('[data-test="retry"]').exists()).toBe(false)
  })

  it('shows no rating', () => {
    enrollments.enrollments.value = [finished()]

    expect(mountView().text()).not.toContain('How was this course')
  })

  it.each([
    ['an enrolment the student does not have', [finished({ course_enrollment_id: 'e-other' })]],
    ['a course still in progress', [makeEnrollment()]],
    ['a course the student left', [makeEnrollment({ status: 'abandoned' })]],
  ])('says the course is not among the finished ones for %s', (_label, list) => {
    enrollments.enrollments.value = list

    const wrapper = mountView()

    expect(wrapper.find('[data-test="course-completed"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
    expect(linkTo(wrapper, '[data-test="not-found"]')).toEqual({ name: 'my-courses' })
  })

  // ── The way on ──────────────────────────────────────────────────────────

  it('offers a new course first, and practice, when nothing else is in progress', () => {
    enrollments.enrollments.value = [
      finished(),
      makeEnrollment({ course_enrollment_id: 'e-2', course_title: 'Blues basics', status: 'abandoned' }),
    ]
    standalone.paths.value = [standalonePath({ completed_count: 9, lesson_count: 9 })]

    const wrapper = mountView()

    expect(wrapper.find('[data-test="continue"]').exists()).toBe(false)
    const findNext = wrapper.get('[data-test="find-next-course"]')
    expect(findNext.text()).toBe('Find your next course')
    expect(variantOf(wrapper, findNext)).toBe('primary')
    expect(linkTo(wrapper, '[data-test="find-next-course"]')).toEqual({ name: 'course-catalog' })
    const practise = wrapper.get('[data-test="practise"]')
    expect(practise.text()).toBe('Practise what you learned')
    expect(variantOf(wrapper, practise)).not.toBe('primary')
    expect(linkTo(wrapper, '[data-test="practise"]')).toEqual({ name: 'practice-session' })
  })

  it('offers to continue another course in progress first, and a new course quietly', () => {
    enrollments.enrollments.value = [
      finished(),
      makeEnrollment({ course_enrollment_id: 'e-2', course_title: 'Reading rhythm' }),
    ]

    const wrapper = mountView()

    const continueButton = wrapper.get('[data-test="continue"]')
    expect(continueButton.text()).toBe('Continue Reading rhythm')
    expect(variantOf(wrapper, continueButton)).toBe('primary')
    const findNext = wrapper.get('[data-test="find-next-course"]')
    expect(variantOf(wrapper, findNext)).not.toBe('primary')
    expect(wrapper.find('[data-test="practise"]').exists()).toBe(false)
  })

  it('offers the most recently started item when several are in progress', () => {
    enrollments.enrollments.value = [
      finished(),
      makeEnrollment({ course_enrollment_id: 'e-2', course_title: 'Reading rhythm', enrolled_at: '2026-09-03T00:00:00Z' }),
    ]
    standalone.paths.value = [standalonePath({ title: 'Open chords', assigned_at: '2026-09-10T00:00:00Z' })]

    expect(mountView().get('[data-test="continue"]').text()).toBe('Continue Open chords')
  })

  it('makes the other item current and opens My path on it', async () => {
    enrollments.enrollments.value = [
      finished(),
      makeEnrollment({ course_enrollment_id: 'e-2', course_title: 'Reading rhythm' }),
    ]
    setCurrentPath.mockResolvedValueOnce(currentPath({ course_enrollment_id: 'e-2' }))

    const wrapper = mountView()
    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(setCurrentPath).toHaveBeenCalledWith({ courseEnrollmentId: 'e-2' })
    expect(push).toHaveBeenCalledWith({ name: 'path' })
    expect(toast.neutral).not.toHaveBeenCalled()
  })

  it('opens My path without switching when the other item is already current', async () => {
    enrollments.enrollments.value = [
      finished(),
      makeEnrollment({ course_enrollment_id: 'e-2', course_title: 'Reading rhythm' }),
    ]
    current.data.value = currentPath({ course_enrollment_id: 'e-2' })

    const wrapper = mountView()
    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(setCurrentPath).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('stays put and says so when the switch fails', async () => {
    enrollments.enrollments.value = [
      finished(),
      makeEnrollment({ course_enrollment_id: 'e-2', course_title: 'Reading rhythm' }),
    ]
    setCurrentPath.mockRejectedValueOnce(new Error('Failed to switch'))

    const wrapper = mountView()
    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Failed to switch')
    expect(push).not.toHaveBeenCalled()
  })
})
