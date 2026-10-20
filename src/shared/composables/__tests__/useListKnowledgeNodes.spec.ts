import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListKnowledgeNodes } from '@/shared/composables/useListKnowledgeNodes'

describe('useListKnowledgeNodes', () => {
  it('loads the nodes of one kind on creation', async () => {
    const nodes = [
      {
        node_id: 's-1',
        kind: 'skill',
        key: 'triad-shapes',
        names: { en: 'Triad shapes', pt_BR: 'Formas de tríade' },
        descriptions: null,
        languages: ['en', 'pt_BR'],
        parent_id: null,
        instrument_ids: [],
      },
    ]
    GET.mockResolvedValueOnce({ data: nodes, error: undefined, response: { status: 200 } })

    const { nodes: result, isLoading, error } = useListKnowledgeNodes('skill')
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/knowledge-nodes', { params: { query: { kind: 'skill' } } })
    expect(result.value).toEqual(nodes)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'boom' },
      response: { status: 500 },
    })

    const { nodes, isLoading, error } = useListKnowledgeNodes('concept')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(nodes.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
