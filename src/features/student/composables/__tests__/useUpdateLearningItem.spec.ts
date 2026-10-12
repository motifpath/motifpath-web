import { beforeEach, describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useUpdateLearningItem } from '@/features/student/composables/useUpdateLearningItem'
import { makeEnrollment as enrollment, makeStandalonePath as standalonePath } from '@/features/student/testing/learning'
import { buildLearning } from '@/features/student/utils/learning'

const ok = (data: unknown) => ({ data, error: undefined, response: { status: 200 } })
const failed = (message: string) => ({ data: undefined, error: { message }, response: { status: 500 } })

const [course, path] = buildLearning(
  [enrollment({ course_enrollment_id: 'e-1', update_available: true, enrolled_at: '2026-09-03T00:00:00Z' })],
  [standalonePath({ student_path_id: 'sp-1', update_available: true, assigned_at: '2026-09-01T00:00:00Z' })],
  null,
).inProgress

describe('useUpdateLearningItem', () => {
  beforeEach(() => {
    POST.mockReset()
  })

  it('updates a course enrollment and answers with it', async () => {
    const updated = enrollment({ course_enrollment_id: 'e-1', course_version_number: 2 })
    POST.mockResolvedValueOnce(ok(updated))

    const result = await useUpdateLearningItem().update(course!)

    expect(POST).toHaveBeenCalledWith('/students/me/course-enrollments/{course_enrollment_id}/update', {
      params: { path: { course_enrollment_id: 'e-1' } },
    })
    expect(result).toEqual({ enrollment: updated })
  })

  it('updates a standalone path and answers with it', async () => {
    const updated = standalonePath({ student_path_id: 'sp-1', lesson_count: 10 })
    POST.mockResolvedValueOnce(ok(updated))

    const result = await useUpdateLearningItem().update(path!)

    expect(POST).toHaveBeenCalledWith('/students/me/paths/{student_path_id}/update', {
      params: { path: { student_path_id: 'sp-1' } },
    })
    expect(result).toEqual({ path: updated })
  })

  it('fails when the server refuses', async () => {
    POST.mockResolvedValueOnce(failed('boom'))

    await expect(useUpdateLearningItem().update(course!)).rejects.toThrow()
  })
})
