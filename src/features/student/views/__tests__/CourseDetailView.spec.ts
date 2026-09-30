import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type CourseDetail = components['schemas']['CourseDetail']
type CourseEnrollment = components['schemas']['CourseEnrollment']

const published = {
  course: ref<CourseDetail | null>(null),
  isLoading: ref(false),
  error: ref(false),
  notFound: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/usePublishedCourse', () => ({
  usePublishedCourse: () => published,
}))

const enrollments = {
  enrollments: ref<CourseEnrollment[]>([]),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useMyCourseEnrollments', () => ({
  useMyCourseEnrollments: () => enrollments,
}))

const enrollInCourse = vi.fn()
vi.mock('@/features/student/composables/useEnrollInCourse', () => ({
  useEnrollInCourse: () => ({ enrollInCourse }),
}))

const setCurrentPath = vi.fn()
vi.mock('@/features/student/composables/useSetCurrentPath', () => ({
  useSetCurrentPath: () => ({ setCurrentPath }),
}))

const toast = { success: vi.fn(), error: vi.fn() }
vi.mock('@/shared/composables/useToast', () => ({
  useToast: () => toast,
}))

const push = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    useRoute: () => ({ params: { courseId: 'c-1' } }),
    useRouter: () => ({ push }),
  }
})

import CourseDetailView from '@/features/student/views/CourseDetailView.vue'

function course(overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    course_id: 'c-1',
    title: 'Fingerstyle journey',
    summary: 'From first arpeggios to full arrangements.',
    level: 'beginner',
    language: 'en',
    created_by: { user_id: 'teacher-1', display_name: 'Bob Martins' },
    status: 'published',
    published_at: '2026-09-01T00:00:00Z',
    thumbnail_url: undefined,
    checkpoint_count: 3,
    lesson_count: 12,
    instrument_ids: [],
    checkpoints: [],
    ...overrides,
  }
}

function enrollment(overrides: Partial<CourseEnrollment> = {}): CourseEnrollment {
  return {
    course_enrollment_id: 'e-1',
    student: { user_id: 'student-1', display_name: 'Alice Souza' },
    course_id: 'c-1',
    course_title: 'Fingerstyle journey',
    course_summary: 'From first arpeggios to full arrangements.',
    course_level: 'beginner',
    course_created_by: { user_id: 'teacher-1', display_name: 'Bob Martins' },
    course_version_number: 1,
    checkpoint_count: 3,
    status: 'active',
    active_checkpoint_student_path_id: 'sp-1',
    active_checkpoint_position: 1,
    enrolled_at: '2026-09-02T00:00:00Z',
    ...overrides,
  }
}

function mountView() {
  return mount(CourseDetailView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('CourseDetailView', () => {
  beforeEach(() => {
    published.course.value = course()
    published.isLoading.value = false
    published.error.value = false
    published.notFound.value = false
    enrollments.enrollments.value = []
    enrollments.isLoading.value = false
    enrollments.error.value = false
    vi.clearAllMocks()
  })

  it('shows the published snapshot, its byline, and its course scope before enrollment', () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="course-detail-title"]').text()).toBe('Fingerstyle journey')
    expect(wrapper.get('[data-test="course-detail-byline"]').text()).toContain('Bob Martins')
    expect(wrapper.get('[data-test="course-detail-lessons"]').text()).toBe('12 lessons')
    expect(wrapper.get('[data-test="course-detail-checkpoints"]').text()).toBe('3 checkpoints')
    expect(wrapper.get('[data-test="enroll"]').text()).toBe('Enroll')
  })

  it('enrolls from the published detail page', async () => {
    enrollInCourse.mockResolvedValueOnce({ outcome: 'enrolled', enrollment: enrollment() })
    const wrapper = mountView()

    await wrapper.get('[data-test="enroll"]').trigger('click')
    await flushPromises()

    expect(enrollInCourse).toHaveBeenCalledWith('c-1')
    expect(toast.success).toHaveBeenCalled()
    expect(wrapper.get('[data-test="continue"]').text()).toBe('Continue course')
  })

  it('continues an active enrollment instead of offering a duplicate enrollment', async () => {
    enrollments.enrollments.value = [enrollment()]
    const wrapper = mountView()

    expect(wrapper.find('[data-test="enroll"]').exists()).toBe(false)
    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(setCurrentPath).toHaveBeenCalledWith({ courseEnrollmentId: 'e-1' })
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('explains when the published snapshot does not exist', () => {
    published.course.value = null
    published.notFound.value = true

    expect(mountView().find('[data-test="not-found"]').exists()).toBe(true)
  })
})
