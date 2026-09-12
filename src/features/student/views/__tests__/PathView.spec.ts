import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

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
