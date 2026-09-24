import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'

describe('useMyCourseEnrollments', () => {
  beforeEach(() => GET.mockReset())

  it('loads the caller\'s course enrollments on creation', async () => {
    const enrollments = [{ course_enrollment_id: 'e-1', course_id: 'c-1', status: 'active' }]
    GET.mockResolvedValueOnce({ data: enrollments, error: undefined, response: { status: 200 } })

    const { enrollments: result, isLoading, error } = useMyCourseEnrollments()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/students/me/course-enrollments', {})
    expect(result.value).toEqual(enrollments)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { enrollments, isLoading, error } = useMyCourseEnrollments()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(enrollments.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
