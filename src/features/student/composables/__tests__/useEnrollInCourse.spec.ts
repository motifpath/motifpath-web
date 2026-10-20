import { beforeEach, describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useEnrollInCourse } from '@/features/student/composables/useEnrollInCourse'

describe('useEnrollInCourse', () => {
  beforeEach(() => POST.mockReset())

  it('posts the course id and returns the new enrollment', async () => {
    const enrollment = { course_enrollment_id: 'e-1', course_id: 'c-1', status: 'active' }
    POST.mockResolvedValueOnce({ data: enrollment, error: undefined, response: { status: 201 } })

    const { enrollInCourse } = useEnrollInCourse()
    const result = await enrollInCourse('c-1')

    expect(POST).toHaveBeenCalledWith('/students/me/course-enrollments', { body: { course_id: 'c-1' } })
    expect(result).toEqual({ outcome: 'enrolled', enrollment })
  })

  it('reports an existing active enrollment for the same course as already-enrolled, not as a failure', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'exists' }, response: { status: 409 } })

    const { enrollInCourse } = useEnrollInCourse()

    await expect(enrollInCourse('c-1')).resolves.toEqual({ outcome: 'already-enrolled' })
  })

  it('throws a described error for any other failure', async () => {
    POST.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'Course is not open for enrollment' },
      response: { status: 404 },
    })

    const { enrollInCourse } = useEnrollInCourse()

    await expect(enrollInCourse('c-1')).rejects.toThrow('Course is not open for enrollment')
  })
})
