import { describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { usePublishContentNode } from '@/features/teacher/composables/usePublishContentNode'

describe('usePublishContentNode', () => {
  it('posts to the publish endpoint and returns the new version', async () => {
    const version = { content_node_id: 'cn-1', version_number: 2 }
    POST.mockResolvedValueOnce({ data: version, error: undefined, response: { status: 201 } })

    const { publishContentNode } = usePublishContentNode()
    const result = await publishContentNode('cn-1')

    expect(POST).toHaveBeenCalledWith('/content-nodes/{content_node_id}/publish', {
      params: { path: { content_node_id: 'cn-1' } },
    })
    expect(result).toEqual(version)
  })

  it('throws with the server error message when publishing fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 403 } })

    const { publishContentNode } = usePublishContentNode()

    await expect(publishContentNode('cn-1')).rejects.toThrow('Boom')
  })

  it('throws a fallback message when the server gives no error message', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } })

    const { publishContentNode } = usePublishContentNode()

    await expect(publishContentNode('cn-1')).rejects.toThrow('Failed to publish the content node')
  })
})
