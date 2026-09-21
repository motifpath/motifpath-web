import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListLearningPaths } from '@/features/teacher/composables/useListLearningPaths'

describe('useListLearningPaths', () => {
  it('loads learning paths on creation', async () => {
    const paths = [{ learning_path_id: 'lp-1', title: 't' }]
    GET.mockResolvedValueOnce({ data: paths, error: undefined, response: { status: 200 } })

    const { learningPaths: result, isLoading, error } = useListLearningPaths()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/learning-paths', {})
    expect(result.value).toEqual(paths)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { learningPaths, isLoading, error } = useListLearningPaths()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(learningPaths.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
