import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListContentNodes } from '@/features/teacher/composables/useListContentNodes'

describe('useListContentNodes', () => {
  it('loads content nodes on creation', async () => {
    const contentNodes = [{ content_node_id: 'cn-1', title: 't' }]
    GET.mockResolvedValueOnce({ data: contentNodes, error: undefined, response: { status: 200 } })

    const { contentNodes: result, isLoading, error } = useListContentNodes()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/content-nodes', {})
    expect(result.value).toEqual(contentNodes)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { contentNodes, isLoading, error } = useListContentNodes()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(contentNodes.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
