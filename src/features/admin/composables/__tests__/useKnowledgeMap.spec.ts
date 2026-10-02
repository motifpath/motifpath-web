import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
const POST = vi.fn()
const PATCH = vi.fn()
const DELETE = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET, POST, PATCH, DELETE }, eventApi: {} }),
}))

import { useKnowledgeMap } from '@/features/admin/composables/useKnowledgeMap'

const bends = {
  node_id: 'n-bends',
  kind: 'skill',
  key: 'bends',
  names: { en: 'Bends', pt_BR: 'Bends' },
  descriptions: null,
  languages: ['en', 'pt_BR'],
  parent_id: null,
  instrument_ids: [],
}
const edge = { edge_id: 'e-1', from_id: 'n-vibrato', to_id: 'n-bends', type: 'requires', level: 'fluent' }

function ok(data: unknown, status = 200) {
  return { data, error: undefined, response: { status } }
}

function serveLists(nodes: unknown[] = [bends], edges: unknown[] = [edge]) {
  GET.mockImplementation((path: string) => Promise.resolve(ok(path === '/knowledge-nodes' ? nodes : edges)))
}

describe('useKnowledgeMap', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    serveLists()
  })

  it('loads every node and every edge, unfiltered', async () => {
    const map = useKnowledgeMap()
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/knowledge-nodes', {})
    expect(GET).toHaveBeenCalledWith('/knowledge-edges', {})
    expect(map.nodes.value).toEqual([bends])
    expect(map.edges.value).toEqual([edge])
    expect(map.isLoading.value).toBe(false)
    expect(map.loadFailed.value).toBe(false)
  })

  it('reports a failed load and loads again on retry', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const map = useKnowledgeMap()
    await flushPromises()
    expect(map.loadFailed.value).toBe(true)

    await map.reload()

    expect(map.loadFailed.value).toBe(false)
    expect(map.nodes.value).toEqual([bends])
  })

  it('creates a node, reloads the map and returns the created node', async () => {
    const map = useKnowledgeMap()
    await flushPromises()
    POST.mockResolvedValueOnce(ok(bends, 201))
    GET.mockClear()

    const request = { kind: 'skill' as const, key: 'bends', names: { en: 'Bends', pt_BR: 'Bends' } }
    const outcome = await map.createNode(request)

    expect(POST).toHaveBeenCalledWith('/knowledge-nodes', { body: request })
    expect(outcome).toEqual({ ok: true, data: bends })
    expect(GET).toHaveBeenCalledTimes(2)
  })

  it('returns the status, message and field errors of a refused write, without reloading', async () => {
    const map = useKnowledgeMap()
    await flushPromises()
    PATCH.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'request failed validation', errors: [{ field: '/instrument_ids', reason: 'wider than the parent' }] },
      response: { status: 400 },
    })
    GET.mockClear()

    const outcome = await map.updateNode('n-bends', { instrument_ids: [] })

    expect(PATCH).toHaveBeenCalledWith('/knowledge-nodes/{node_id}', {
      params: { path: { node_id: 'n-bends' } },
      body: { instrument_ids: [] },
    })
    expect(outcome).toEqual({
      ok: false,
      status: 400,
      message: 'Request failed validation',
      fields: [{ field: '/instrument_ids', reason: 'wider than the parent' }],
    })
    expect(GET).not.toHaveBeenCalled()
  })

  it('reports a network failure with status 0', async () => {
    const map = useKnowledgeMap()
    await flushPromises()
    DELETE.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const outcome = await map.deleteNode('n-bends')

    expect(outcome).toEqual({ ok: false, status: 0, message: '', fields: [] })
  })

  it('deletes a node', async () => {
    const map = useKnowledgeMap()
    await flushPromises()
    DELETE.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 204 } })

    const outcome = await map.deleteNode('n-bends')

    expect(DELETE).toHaveBeenCalledWith('/knowledge-nodes/{node_id}', { params: { path: { node_id: 'n-bends' } } })
    expect(outcome).toEqual({ ok: true, data: undefined })
  })

  it('creates, re-levels and deletes edges', async () => {
    const map = useKnowledgeMap()
    await flushPromises()
    POST.mockResolvedValueOnce(ok(edge, 201))
    PATCH.mockResolvedValueOnce(ok({ ...edge, level: 'retained' }))
    DELETE.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 204 } })

    const request = { from_id: 'n-vibrato', to_id: 'n-bends', type: 'requires' as const, level: 'fluent' as const }
    await map.createEdge(request)
    await map.updateEdgeLevel('e-1', 'retained')
    await map.deleteEdge('e-1')

    expect(POST).toHaveBeenCalledWith('/knowledge-edges', { body: request })
    expect(PATCH).toHaveBeenCalledWith('/knowledge-edges/{edge_id}', {
      params: { path: { edge_id: 'e-1' } },
      body: { level: 'retained' },
    })
    expect(DELETE).toHaveBeenCalledWith('/knowledge-edges/{edge_id}', { params: { path: { edge_id: 'e-1' } } })
  })
})
