import { describe, expect, it, vi } from 'vitest'

const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PUT }, eventApi: {} }),
}))

import type { components } from '@/api/generated/core-domain'
import { useReplaceLearningPath } from '@/features/teacher/composables/useReplaceLearningPath'

type ReplaceLearningPathRequest = components['schemas']['ReplaceLearningPathRequest']

describe('useReplaceLearningPath', () => {
  it('puts the request and returns the replaced learning path', async () => {
    const path = { learning_path_id: 'lp-1' }
    PUT.mockResolvedValueOnce({ data: path, error: undefined, response: { status: 200 } })

    const { replaceLearningPath } = useReplaceLearningPath()
    const request: ReplaceLearningPathRequest = { title: 'Beginner guitar', level: 'beginner', instrument_ids: [], items: [{ content_node_id: 'cn-1' }] }

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
      replaceLearningPath('lp-1', { title: 't', level: 'beginner', instrument_ids: [], items: [{ content_node_id: 'cn-1' }] }),
    ).rejects.toThrow('Boom')
  })
})
