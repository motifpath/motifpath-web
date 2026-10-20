import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useFirstRun } from '@/features/student/composables/useFirstRun'

function answer(enrollments: unknown[] | 'fail', paths: unknown[] | 'fail') {
  GET.mockImplementation(async (url: string) => {
    const result = url === '/students/me/course-enrollments' ? enrollments : paths
    return result === 'fail'
      ? { data: undefined, error: { message: 'boom' }, response: { status: 500 } }
      : { data: result, error: undefined, response: { status: 200 } }
  })
}

async function settled() {
  const firstRun = useFirstRun()
  await vi.waitFor(() => expect(firstRun.status.value).not.toBe('loading'))
  return firstRun
}

describe('useFirstRun', () => {
  beforeEach(() => {
    GET.mockReset()
  })

  it('is the first run for a student who holds no course enrolment and no path at all', async () => {
    answer([], [])

    expect((await settled()).status.value).toBe('first-run')
  })

  it('is not the first run once anything was started, even if it was left since', async () => {
    answer([{ course_enrollment_id: 'e-1', status: 'abandoned' }], [])

    expect((await settled()).status.value).toBe('returning')
  })

  it('is not the first run for a student who holds only an archived path', async () => {
    answer([], [{ student_path_id: 'sp-1', archived_at: '2026-10-01T00:00:00Z' }])

    expect((await settled()).status.value).toBe('returning')
  })

  it('cannot tell when either list fails, and can try again', async () => {
    answer('fail', [])
    const firstRun = await settled()

    expect(firstRun.status.value).toBe('failed')

    answer([], [])
    await firstRun.retry()

    expect(firstRun.status.value).toBe('first-run')
  })

  it('is loading until both lists have answered', () => {
    GET.mockImplementation(() => new Promise(() => {}))

    expect(useFirstRun().status.value).toBe('loading')
  })
})
