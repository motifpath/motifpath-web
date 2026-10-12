import { beforeEach, describe, expect, it, vi } from 'vitest'

const PUT = vi.fn()
const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PUT, POST }, eventApi: {} }),
}))

const { announceCurrentPath } = vi.hoisted(() => ({ announceCurrentPath: vi.fn() }))
vi.mock('@/features/student/composables/currentPathAnnouncer', () => ({ announceCurrentPath }))

import {
  LeaveFailedAfterSwitchError,
  useLeaveLearningItem,
} from '@/features/student/composables/useLeaveLearningItem'
import {
  makeCurrentPath as currentPath,
  makeEnrollment as enrollment,
  makeStandalonePath as standalonePath,
} from '@/features/student/testing/learning'
import { buildLearning } from '@/features/student/utils/learning'

const ok = (data: unknown) => ({ data, error: undefined, response: { status: 200 } })
const refused = (message: string) => ({ data: undefined, error: { message }, response: { status: 409 } })

const groups = buildLearning(
  [
    enrollment({ course_enrollment_id: 'e-1', course_title: 'Guitar foundations', enrolled_at: '2026-09-01T00:00:00Z' }),
    enrollment({ course_enrollment_id: 'e-2', course_title: 'Reading rhythm', enrolled_at: '2026-09-03T00:00:00Z' }),
  ],
  [standalonePath({ student_path_id: 'sp-1', assigned_at: '2026-08-01T00:00:00Z' })],
  currentPath({ course_enrollment_id: 'e-1' }),
)
const [guitar, rhythm, openChords] = groups.inProgress

describe('useLeaveLearningItem', () => {
  beforeEach(() => {
    PUT.mockReset()
    POST.mockReset()
    announceCurrentPath.mockReset()
  })

  it('abandons a course that is not current, leaving the current one alone', async () => {
    const abandoned = enrollment({ course_enrollment_id: 'e-2', status: 'abandoned' })
    POST.mockResolvedValueOnce(ok(abandoned))

    const result = await useLeaveLearningItem().leave(rhythm!, guitar!)

    expect(PUT).not.toHaveBeenCalled()
    expect(POST).toHaveBeenCalledWith('/students/me/course-enrollments/{course_enrollment_id}/abandon', {
      params: { path: { course_enrollment_id: 'e-2' } },
    })
    expect(result).toEqual({ enrollment: abandoned })
  })

  it('archives a standalone path', async () => {
    const archived = standalonePath({ student_path_id: 'sp-1', archived_at: '2026-10-12T00:00:00Z' })
    POST.mockResolvedValueOnce(ok(archived))

    const result = await useLeaveLearningItem().leave(openChords!, guitar!)

    expect(POST).toHaveBeenCalledWith('/students/me/paths/{student_path_id}/archive', {
      params: { path: { student_path_id: 'sp-1' } },
    })
    expect(result).toEqual({ path: archived })
  })

  it('makes the next item current before leaving the current one', async () => {
    const nowOn = currentPath({ course_enrollment_id: 'e-2', student_path_id: 'sp-e2' })
    PUT.mockResolvedValueOnce(ok(nowOn))
    POST.mockResolvedValueOnce(ok(enrollment({ course_enrollment_id: 'e-1', status: 'abandoned' })))

    const result = await useLeaveLearningItem().leave(guitar!, rhythm!)

    expect(PUT).toHaveBeenCalledWith('/students/me/current-path', { body: { course_enrollment_id: 'e-2' } })
    expect(PUT.mock.invocationCallOrder[0]).toBeLessThan(POST.mock.invocationCallOrder[0]!)
    expect(result.current).toEqual(nowOn)
  })

  it('leaves nothing current when the current item was the only one in progress', async () => {
    POST.mockResolvedValueOnce(ok(enrollment({ course_enrollment_id: 'e-1', status: 'abandoned' })))

    const result = await useLeaveLearningItem().leave(guitar!, null)

    expect(PUT).not.toHaveBeenCalled()
    expect(result.current).toBeNull()
    expect(announceCurrentPath).toHaveBeenCalledWith(null)
  })

  it('does not leave when the switch fails', async () => {
    PUT.mockResolvedValueOnce(refused('Could not switch'))

    await expect(useLeaveLearningItem().leave(guitar!, rhythm!)).rejects.toThrow('Could not switch')
    expect(POST).not.toHaveBeenCalled()
  })

  it('says where the student is now when the leave fails after the switch', async () => {
    const nowOn = currentPath({ course_enrollment_id: 'e-2', student_path_id: 'sp-e2' })
    PUT.mockResolvedValueOnce(ok(nowOn))
    POST.mockResolvedValueOnce(refused('Could not leave'))

    const error = await useLeaveLearningItem()
      .leave(guitar!, rhythm!)
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(LeaveFailedAfterSwitchError)
    expect(error).toMatchObject({ current: nowOn })
  })
})
