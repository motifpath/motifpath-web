import { beforeEach, describe, expect, it, vi } from 'vitest'

const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PUT }, eventApi: {} }),
}))

import { useSetCurrentPath } from '@/features/student/composables/useSetCurrentPath'

const pathView = { student_path_id: 'sp-1', title: 'Open chords' }

describe('useSetCurrentPath', () => {
  beforeEach(() => PUT.mockReset())

  it('makes a course enrollment current and returns the new current path', async () => {
    PUT.mockResolvedValueOnce({ data: pathView, error: undefined, response: { status: 200 } })

    const { setCurrentPath } = useSetCurrentPath()
    const result = await setCurrentPath({ courseEnrollmentId: 'e-1' })

    expect(PUT).toHaveBeenCalledWith('/students/me/current-path', {
      body: { course_enrollment_id: 'e-1' },
    })
    expect(result).toEqual(pathView)
  })

  it('makes a standalone path current', async () => {
    PUT.mockResolvedValueOnce({ data: pathView, error: undefined, response: { status: 200 } })

    const { setCurrentPath } = useSetCurrentPath()
    await setCurrentPath({ studentPathId: 'sp-1' })

    expect(PUT).toHaveBeenCalledWith('/students/me/current-path', {
      body: { student_path_id: 'sp-1' },
    })
  })

  it('throws a described error when the switch is refused', async () => {
    PUT.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'That path is archived' },
      response: { status: 404 },
    })

    const { setCurrentPath } = useSetCurrentPath()

    await expect(setCurrentPath({ studentPathId: 'sp-9' })).rejects.toThrow('That path is archived')
  })
})
