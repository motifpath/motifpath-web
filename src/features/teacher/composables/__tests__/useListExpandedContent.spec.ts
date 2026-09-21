import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListExpandedContent } from '@/features/teacher/composables/useListExpandedContent'

describe('useListExpandedContent', () => {
  it('loads the content node expanded content on creation', async () => {
    const items = [{ expanded_content_id: 'ec-1' }]
    GET.mockResolvedValueOnce({ data: { items, total: 1 }, error: undefined, response: { status: 200 } })

    const { items: result, isLoading, error } = useListExpandedContent('cn-1')
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/content-nodes/{content_node_id}/expanded-content', {
      params: { path: { content_node_id: 'cn-1' } },
    })
    expect(result.value).toEqual(items)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { items, isLoading, error } = useListExpandedContent('cn-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(items.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
