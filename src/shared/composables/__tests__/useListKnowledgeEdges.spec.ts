import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListKnowledgeEdges } from '@/shared/composables/useListKnowledgeEdges'

describe('useListKnowledgeEdges', () => {
  it('loads the edges of one type on creation', async () => {
    const edges = [{ edge_id: 'e-1', from_id: 's-1', to_id: 'c-1', type: 'applies', level: null }]
    GET.mockResolvedValueOnce({ data: edges, error: undefined, response: { status: 200 } })

    const { edges: result, isLoading } = useListKnowledgeEdges('applies')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/knowledge-edges', { params: { query: { type: 'applies' } } })
    expect(result.value).toEqual(edges)
  })
})
