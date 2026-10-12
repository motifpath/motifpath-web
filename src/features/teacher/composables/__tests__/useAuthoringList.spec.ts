import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useAuthoringList } from '@/features/teacher/composables/useAuthoringList'
import { emptyListState, parseListQuery } from '@/features/teacher/utils/authoringListQuery'

const SKILL_A = '3f4b6f2a-8c3e-4b1a-9d2e-7a1c5f0e9b21'

function envelope(total: number, items: unknown[] = []) {
  return { data: { items, total, limit: 20, offset: 0 } }
}

/** The query of the n-th call to an endpoint. */
function queryOf(path: string, n = 0) {
  const calls = GET.mock.calls.filter(([p]) => p === path)
  return calls[n]?.[1]?.params?.query
}

beforeEach(() => {
  GET.mockReset()
  GET.mockResolvedValue(envelope(0))
})

describe('useAuthoringList', () => {
  it('loads the first 20 items of the section for the chosen filters', async () => {
    const state = reactive(parseListQuery('diagrams', { kind: 'custom', root: 'A' }))
    GET.mockResolvedValue(envelope(46, [{ diagram_id: 'd1' }]))

    const list = useAuthoringList('diagrams', state)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))

    expect(queryOf('/diagrams')).toEqual(expect.objectContaining({ kind: 'custom', root_note: 'A', limit: 20, offset: 0 }))
    expect(list.items.value).toEqual([{ diagram_id: 'd1' }])
    expect(list.total.value).toBe(46)
  })

  it('starts over from the first page when the filters change', async () => {
    const state = reactive(emptyListState())
    const list = useAuthoringList('exercises', state)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))
    GET.mockClear()

    state.filters = { skills: [SKILL_A], concepts: [] }
    await vi.waitFor(() => expect(queryOf('/exercises')).toBeDefined())

    expect(queryOf('/exercises')).toEqual(expect.objectContaining({ skill_ids: [SKILL_A], offset: 0 }))
  })

  it('starts over when the sort or the status chip changes', async () => {
    const state = reactive(emptyListState())
    const list = useAuthoringList('lessons', state)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))
    GET.mockClear()

    state.sort = 'updated'
    state.status = 'draft'
    await vi.waitFor(() => expect(queryOf('/content-nodes')).toBeDefined())

    expect(queryOf('/content-nodes')).toEqual(expect.objectContaining({ sort: 'updated', status: 'draft' }))
  })

  it("counts the section's items without any search or filter", async () => {
    const state = reactive(parseListQuery('courses', { q: 'blues', level: 'beginner', status: 'draft' }))
    GET.mockImplementation((_path: string, options: { params: { query: { limit: number } } }) =>
      Promise.resolve(envelope(options.params.query.limit === 1 ? 1284 : 3)),
    )

    const list = useAuthoringList('courses', state)
    await vi.waitFor(() => expect(list.sectionTotal.value).toBe(1284))

    expect(GET).toHaveBeenCalledWith('/courses', { params: { query: { limit: 1, offset: 0 } } })
  })

  it('counts what another choice of filters would show, without loading it', async () => {
    const state = reactive(emptyListState())
    const list = useAuthoringList('diagrams', state)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))
    GET.mockResolvedValue(envelope(46))

    const count = await list.countFor(parseListQuery('diagrams', { kind: 'custom' }))

    expect(count).toBe(46)
    expect(GET).toHaveBeenLastCalledWith('/diagrams', { params: { query: { kind: 'custom', limit: 1, offset: 0 } } })
  })

  it('has no count when counting fails', async () => {
    const state = reactive(emptyListState())
    const list = useAuthoringList('paths', state)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))
    GET.mockResolvedValue({ error: { message: 'down' } })

    expect(await list.countFor(emptyListState())).toBeNull()
  })
})
