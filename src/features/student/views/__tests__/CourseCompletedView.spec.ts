import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type CourseEnrollment = components['schemas']['CourseEnrollment']

const route = { params: { enrollmentId: 'ce-1' } }
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route }
})

const state = {
  enrollments: ref<CourseEnrollment[]>([]),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useMyCourseEnrollments', () => ({
  useMyCourseEnrollments: () => state,
}))

import CourseCompletedView from '@/features/student/views/CourseCompletedView.vue'

function enrollment(overrides: Partial<CourseEnrollment> = {}): CourseEnrollment {
  return {
    course_enrollment_id: 'ce-1',
    student: { user_id: 'u-1', display_name: 'Sam Student' },
    course_id: 'c-1',
    course_title: 'Blues Guitar Foundations',
    course_thumbnail_url: 'https://cdn.example.test/blues.png',
    course_version_number: 1,
    status: 'completed',
    active_checkpoint_student_path_id: null,
    active_checkpoint_position: null,
    enrolled_at: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

function mountView() {
  return mount(CourseCompletedView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

function linkTargets(wrapper: ReturnType<typeof mountView>) {
  return wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))
}

describe('CourseCompletedView', () => {
  beforeEach(() => {
    route.params.enrollmentId = 'ce-1'
    state.enrollments.value = []
    state.isLoading.value = false
    state.error.value = false
    state.retry.mockReset()
  })

  it('shows a loading state while the enrollments load', () => {
    state.isLoading.value = true

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('shows an error state whose retry reloads the enrollments', async () => {
    state.error.value = true

    const wrapper = mountView()
    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(state.retry).toHaveBeenCalled()
  })

  it('congratulates the student on the course they finished', () => {
    state.enrollments.value = [enrollment()]

    const wrapper = mountView()

    expect(wrapper.get('[data-test="course-completed"]').text()).toContain('Blues Guitar Foundations')
    expect(wrapper.get('img').attributes('src')).toBe('https://cdn.example.test/blues.png')
  })

  it('points the student to their next course and back to their courses', () => {
    state.enrollments.value = [enrollment()]

    const targets = linkTargets(mountView())

    expect(targets).toContainEqual({ name: 'course-catalog' })
    expect(targets).toContainEqual({ name: 'my-courses' })
  })

  it.each([
    ['an enrollment the student does not have', [enrollment({ course_enrollment_id: 'ce-other' })]],
    ['a course still in progress', [enrollment({ status: 'active', active_checkpoint_position: 2 })]],
    ['a course the student left', [enrollment({ status: 'abandoned' })]],
  ])('shows a not-found state, with a way back to My courses, for %s', (_label, enrollments) => {
    state.enrollments.value = enrollments

    const wrapper = mountView()

    expect(wrapper.find('[data-test="course-completed"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
    expect(linkTargets(wrapper)).toContainEqual({ name: 'my-courses' })
  })
})
