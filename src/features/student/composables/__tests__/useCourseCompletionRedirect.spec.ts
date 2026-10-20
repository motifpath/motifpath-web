import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref, type Ref } from 'vue'
import type * as VueRouter from 'vue-router'

const replace = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRouter: () => ({ replace }) }
})

import { useCourseCompletionRedirect } from '@/features/student/composables/useCourseCompletionRedirect'

function mountWith(enrollmentId: Ref<string | null>) {
  return mount(
    defineComponent({
      setup() {
        useCourseCompletionRedirect(enrollmentId)
        return () => null
      },
    }),
  )
}

describe('useCourseCompletionRedirect', () => {
  beforeEach(() => replace.mockReset())

  it('replaces the page with the course-completed screen once a completed enrollment is known', async () => {
    const enrollmentId = ref<string | null>(null)
    mountWith(enrollmentId)

    expect(replace).not.toHaveBeenCalled()

    enrollmentId.value = 'ce-1'
    await nextTick()

    expect(replace).toHaveBeenCalledWith({ name: 'course-completed', params: { enrollmentId: 'ce-1' } })
  })

  it('redirects right away when the completed enrollment is already known at setup', () => {
    mountWith(ref<string | null>('ce-1'))

    expect(replace).toHaveBeenCalledWith({ name: 'course-completed', params: { enrollmentId: 'ce-1' } })
  })
})
