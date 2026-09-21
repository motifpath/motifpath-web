import { describe, expect, it, vi } from 'vitest'

const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PUT }, eventApi: {} }),
}))

import { useReplaceLearningPath } from '@/features/teacher/composables/useReplaceLearningPath'

describe('useReplaceLearningPath', () => {
  it('puts the request and returns the replaced learning path', async () => {
    const path = { learning_path_id: 'lp-1' }
    PUT.mockResolvedValueOnce({ data: path, error: undefined, response: { status: 200 } })

    const { replaceLearningPath } = useReplaceLearningPath()
    const request = { title: 'Beginner guitar', items: [{ content_node_id: 'cn-1' }] }

    const result = await replaceLearningPath('lp-1', request)

    expect(PUT).toHaveBeenCalledWith('/learning-paths/{learning_path_id}', {
      params: { path: { learning_path_id: 'lp-1' } },
      body: request,
    })
    expect(result).toEqual(path)
  })

  it('throws with the server error message when the replace fails', async () => {
    PUT.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { replaceLearningPath } = useReplaceLearningPath()

    await expect(
      replaceLearningPath('lp-1', { title: 't', items: [{ content_node_id: 'cn-1' }] }),
    ).rejects.toThrow('Boom')
  })
})
