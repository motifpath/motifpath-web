import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useLearningPath } from '@/features/teacher/composables/useLearningPath'

describe('useLearningPath', () => {
  it('loads the learning path by id on creation', async () => {
    const path = { learning_path_id: 'lp-1', title: 't' }
    GET.mockResolvedValueOnce({ data: path, error: undefined, response: { status: 200 } })

    const { learningPath, isLoading, error } = useLearningPath('lp-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/learning-paths/{learning_path_id}', {
      params: { path: { learning_path_id: 'lp-1' } },
    })
    expect(learningPath.value).toEqual(path)
    expect(error.value).toBe(false)
  })

  it('sets error and clears the path when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'not found' }, response: { status: 404 } })

    const { learningPath, isLoading, error } = useLearningPath('lp-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(error.value).toBe(true)
    expect(learningPath.value).toBeNull()
  })
})
