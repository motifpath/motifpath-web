import { describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useCreateLearningPath } from '@/features/teacher/composables/useCreateLearningPath'

describe('useCreateLearningPath', () => {
  it('posts the request and returns the created learning path', async () => {
    const path = { learning_path_id: 'lp-1' }
    POST.mockResolvedValueOnce({ data: path, error: undefined, response: { status: 201 } })

    const { createLearningPath } = useCreateLearningPath()
    const request = { title: 'Beginner guitar', items: [{ content_node_id: 'cn-1' }] }

    const result = await createLearningPath(request)

    expect(POST).toHaveBeenCalledWith('/learning-paths', { body: request })
    expect(result).toEqual(path)
  })

  it('throws with the server error message when creation fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { createLearningPath } = useCreateLearningPath()

    await expect(createLearningPath({ title: 't', items: [{ content_node_id: 'cn-1' }] })).rejects.toThrow('Boom')
  })

  it('throws a fallback message when the server gives no error message', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } })

    const { createLearningPath } = useCreateLearningPath()

    await expect(createLearningPath({ title: 't', items: [{ content_node_id: 'cn-1' }] })).rejects.toThrow(
      'Failed to create the learning path',
    )
  })
})
