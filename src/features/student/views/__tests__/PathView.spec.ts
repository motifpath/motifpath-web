import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import {
  makeStudentPathItem as step,
  makeStudentPathView as view,
} from '@/features/student/testing/studentPathItem'

type StudentPathView = components['schemas']['StudentPathView']

const state = {
  data: ref<StudentPathView | null>(null),
  error: ref<string | null>(null),
  isLoading: ref(false),
  retry: vi.fn(),
}

vi.mock('@/features/student/composables/useStudentPath', () => ({
  useStudentPath: () => state,
}))

const replace = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRouter: () => ({ replace }) }
})

import PathView from '@/features/student/views/PathView.vue'

function mountView() {
  return mount(PathView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

function set(next: Partial<typeof state>) {
  state.isLoading.value = next.isLoading?.value ?? false
  state.error.value = next.error?.value ?? null
  state.data.value = next.data?.value ?? null
}

describe('PathView', () => {
  it('takes the student to the course-completed screen when this path just completed their course', () => {
    replace.mockReset()
    set({
      data: ref(
        view([step(1, undefined, 'completed')], {
          course_completed: true,
          course_enrollment_id: 'ce-1',
          course_checkpoint_position: 2,
        }),
      ),
    })

    mountView()

    expect(replace).toHaveBeenCalledWith({ name: 'course-completed', params: { enrollmentId: 'ce-1' } })
  })

  it('congratulates the student on a finished standalone path and points to what is next', () => {
    set({ data: ref(view([step(1, undefined, 'completed'), step(2, undefined, 'completed')], { title: 'Blues Foundations' })) })

    const wrapper = mountView()
    const card = wrapper.get('[data-test="path-complete"]')

    expect(card.text()).toContain('Blues Foundations')
    const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))
    expect(targets).toContainEqual({ name: 'course-catalog' })
    expect(targets).toContainEqual({ name: 'my-courses' })
    expect(wrapper.find('[data-test="path"]').exists()).toBe(true)
  })

  it('shows no path-complete card while steps are left', () => {
    set({ data: ref(view([step(1, undefined, 'completed'), step(2, undefined, 'in_progress')])) })

    expect(mountView().find('[data-test="path-complete"]').exists()).toBe(false)
  })

  it('stays on the path while the course is still in progress', () => {
    replace.mockReset()
    set({ data: ref(view([step(1, undefined, 'in_progress')], { course_enrollment_id: 'ce-1', course_checkpoint_position: 1 })) })

    mountView()

    expect(replace).not.toHaveBeenCalled()
  })

  it('shows a loading state while the path request is in flight', () => {
    set({ isLoading: ref(true) })

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('shows an error state with a retry control on failure', async () => {
    set({ error: ref('load-failed') })

    const wrapper = mountView()
    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(state.retry).toHaveBeenCalled()
  })

  it('shows a first-class holding state when no path is assigned yet, with no teacher-bound copy', () => {
    set({ error: ref('no-path') })

    const holding = mountView().get('[data-test="no-path"]')

    expect(holding.text()).not.toContain('teacher')
    expect(holding.text().toLowerCase()).toContain('personalized path')
  })

  it('renders the path content once loaded', () => {
    set({ data: ref(view([step(1), step(2)], { title: 'Blues Foundations' })) })

    const wrapper = mountView()

    expect(wrapper.find('[data-test="path"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Blues Foundations')
    expect(wrapper.findAll('[data-test="path-step"]')).toHaveLength(2)
  })
})
