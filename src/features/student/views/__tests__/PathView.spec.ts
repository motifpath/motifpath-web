import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const state = {
  data: ref<{ title: string; items: unknown[] } | null>(null),
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

describe('PathView', () => {
  it('shows a loading state while the path request is in flight', () => {
    state.isLoading.value = true
    state.error.value = null
    state.data.value = null

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('shows an error state with a retry control on failure', async () => {
    state.isLoading.value = false
    state.error.value = 'load-failed'
    state.data.value = null

    const wrapper = mountView()
    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(state.retry).toHaveBeenCalled()
  })

  it('renders the path title once loaded', () => {
    state.isLoading.value = false
    state.error.value = null
    state.data.value = { title: 'Blues Foundations', items: [] }

    expect(mountView().text()).toContain('Blues Foundations')
  })
})
