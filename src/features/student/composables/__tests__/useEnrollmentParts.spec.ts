import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import { makeStudentPathItem, makeStudentPathView } from '@/features/student/testing/studentPathItem'

const get = vi.fn()

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: get }, eventApi: {} }),
}))

import { useEnrollmentParts } from '@/features/student/composables/useEnrollmentParts'

const PARTS = '/students/me/course-enrollments/{course_enrollment_id}/parts'
const part = makeStudentPathView([makeStudentPathItem(1, undefined, 'completed')], { student_path_id: 'part-1' })

describe('useEnrollmentParts', () => {
  beforeEach(() => get.mockReset())

  it('loads the parts of the enrollment it is given', async () => {
    get.mockResolvedValue({ data: [part], error: undefined })

    const parts = useEnrollmentParts(() => 'enrollment-1')
    await flushPromises()

    expect(get).toHaveBeenCalledWith(PARTS, { params: { path: { course_enrollment_id: 'enrollment-1' } } })
    expect(parts.parts.value).toEqual([part])
    expect(parts.isLoading.value).toBe(false)
  })

  it('loads nothing until there is an enrollment, then loads it', async () => {
    get.mockResolvedValue({ data: [part], error: undefined })
    const id = ref<string | null>(null)

    const parts = useEnrollmentParts(id)
    await flushPromises()
    expect(get).not.toHaveBeenCalled()
    expect(parts.parts.value).toEqual([])

    id.value = 'enrollment-1'
    await flushPromises()
    expect(parts.parts.value).toEqual([part])
  })

  it('reports a failure, and retry loads again', async () => {
    get.mockResolvedValue({ data: undefined, error: { message: 'failed' } })
    const parts = useEnrollmentParts(() => 'enrollment-1')
    await flushPromises()
    expect(parts.error.value).toBe(true)

    get.mockResolvedValue({ data: [part], error: undefined })
    await parts.retry()

    expect(parts.error.value).toBe(false)
    expect(parts.parts.value).toEqual([part])
  })
})
