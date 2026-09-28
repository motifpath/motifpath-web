import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeStudentPathItem as item, makeStudentPathView as view } from '@/features/student/testing/studentPathItem'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useLessonCompletionSync } from '@/features/student/composables/useLessonCompletionSync'

const ok = (data: unknown) => ({ data, error: undefined, response: { status: 200 } })
const notFound = { data: undefined, error: { message: 'not found' }, response: { status: 404 } }

// makeStudentPathItem(position) gives the item content_node_id `node-<position>`.
const inProgress = ok(view([item(1, undefined, 'completed'), item(2, undefined, 'in_progress')]))
const recorded = ok(view([item(1, undefined, 'completed'), item(2, undefined, 'completed')]))

function sync(attempts = 5) {
  return useLessonCompletionSync({ intervalMs: 0, attempts })
}

describe('useLessonCompletionSync', () => {
  beforeEach(() => GET.mockReset())

  it('re-reads the current path until the finished lesson shows as completed', async () => {
    GET.mockResolvedValueOnce(inProgress).mockResolvedValueOnce(inProgress).mockResolvedValueOnce(recorded)

    const outcome = await sync().waitForCompletion('node-2')

    expect(outcome).toEqual({ kind: 'recorded' })
    expect(GET).toHaveBeenCalledTimes(3)
    expect(GET).toHaveBeenCalledWith('/students/me/path')
  })

  it('reports the course as completed when a re-read is the one that discovers it', async () => {
    GET.mockResolvedValueOnce(inProgress).mockResolvedValueOnce(
      ok(
        view([item(1, undefined, 'completed'), item(2, undefined, 'completed')], {
          course_completed: true,
          course_enrollment_id: 'ce-1',
          course_checkpoint_position: 3,
        }),
      ),
    )

    const outcome = await sync().waitForCompletion('node-2')

    expect(outcome).toEqual({ kind: 'course-completed', enrollmentId: 'ce-1' })
  })

  it('treats the lesson as recorded once the current path has moved on without it', async () => {
    GET.mockResolvedValueOnce(ok(view([item(7, undefined, 'not_started')])))

    expect(await sync().waitForCompletion('node-2')).toEqual({ kind: 'recorded' })
  })

  it('treats the lesson as recorded once the student has no current path left', async () => {
    GET.mockResolvedValueOnce(notFound)

    expect(await sync().waitForCompletion('node-2')).toEqual({ kind: 'recorded' })
  })

  it('gives up after its attempts, so a slow pipeline never keeps the student waiting', async () => {
    GET.mockResolvedValue(inProgress)

    const outcome = await sync(3).waitForCompletion('node-2')

    expect(outcome).toEqual({ kind: 'timed-out' })
    expect(GET).toHaveBeenCalledTimes(3)
  })

  it('keeps trying through a failed read', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } }).mockResolvedValueOnce(
      recorded,
    )

    expect(await sync().waitForCompletion('node-2')).toEqual({ kind: 'recorded' })
  })
})
