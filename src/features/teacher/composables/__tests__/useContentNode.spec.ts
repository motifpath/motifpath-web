import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useContentNode } from '@/features/teacher/composables/useContentNode'

describe('useContentNode', () => {
  it('loads the content node by id on creation', async () => {
    const contentNode = { content_node_id: 'cn-1', title: 't' }
    GET.mockResolvedValueOnce({ data: contentNode, error: undefined, response: { status: 200 } })

    const { contentNode: loaded, isLoading, error } = useContentNode('cn-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/content-nodes/{content_node_id}', {
      params: { path: { content_node_id: 'cn-1' } },
    })
    expect(loaded.value).toEqual(contentNode)
    expect(error.value).toBe(false)
  })

  it('sets error and clears the content node when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'not found' }, response: { status: 404 } })

    const { contentNode, isLoading, error } = useContentNode('cn-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(error.value).toBe(true)
    expect(contentNode.value).toBeNull()
  })

  it('retry re-runs the load', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const { contentNode, isLoading, error, retry } = useContentNode('cn-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(error.value).toBe(true)

    const contentNodeData = { content_node_id: 'cn-1', title: 't' }
    GET.mockResolvedValueOnce({ data: contentNodeData, error: undefined, response: { status: 200 } })
    await retry()

    expect(error.value).toBe(false)
    expect(contentNode.value).toEqual(contentNodeData)
  })
})
