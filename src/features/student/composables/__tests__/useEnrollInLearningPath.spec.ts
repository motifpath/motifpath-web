import { beforeEach, describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useEnrollInLearningPath } from '@/features/student/composables/useEnrollInLearningPath'

describe('useEnrollInLearningPath', () => {
  beforeEach(() => POST.mockReset())

  it('posts the learning path id and returns the new copy', async () => {
    const studentPath = { student_path_id: 'sp-1', source_template_id: 'lp-1' }
    POST.mockResolvedValueOnce({ data: studentPath, error: undefined, response: { status: 201 } })

    const { enrollInLearningPath } = useEnrollInLearningPath()
    const result = await enrollInLearningPath('lp-1')

    expect(POST).toHaveBeenCalledWith('/students/me/student-paths', { body: { learning_path_id: 'lp-1' } })
    expect(result).toEqual(studentPath)
  })

  it('returns the copy the learner already holds when the server reuses it', async () => {
    const studentPath = { student_path_id: 'sp-old', source_template_id: 'lp-1' }
    POST.mockResolvedValueOnce({ data: studentPath, error: undefined, response: { status: 200 } })

    const { enrollInLearningPath } = useEnrollInLearningPath()

    await expect(enrollInLearningPath('lp-1')).resolves.toEqual(studentPath)
  })

  it('throws a described error when the enrollment fails', async () => {
    POST.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'Learning path not found' },
      response: { status: 404 },
    })

    const { enrollInLearningPath } = useEnrollInLearningPath()

    await expect(enrollInLearningPath('lp-1')).rejects.toThrow('Learning path not found')
  })
})
