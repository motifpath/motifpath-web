import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { type DiagramFilters, useListDiagrams } from '@/features/teacher/composables/useListDiagrams'

function ok(items: unknown[], total = items.length, offset = 0, limit = 20) {
  return { data: { items, total, limit, offset }, error: undefined, response: { status: 200 } }
}

describe('useListDiagrams', () => {
  beforeEach(() => GET.mockReset())

  it('loads the first page with no filters', async () => {
    const page = [{ diagram_id: 'd-1', name: 'Minor Pentatonic' }]
    GET.mockResolvedValueOnce(ok(page, 30))

    const { diagrams, total, hasMore, isLoading, error } = useListDiagrams()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/diagrams', { params: { query: { limit: 20, offset: 0 } } })
    expect(diagrams.value).toEqual(page)
    expect(total.value).toBe(30)
    expect(hasMore.value).toBe(true)
    expect(error.value).toBe(false)
  })

  it('passes every filter through as a query param', async () => {
    GET.mockResolvedValueOnce(ok([]))

    useListDiagrams(() => ({ kind: 'custom', createdBy: 'u-1', instrumentId: 'i-1', skillId: 's-1', conceptId: 'c-1' }))
    await vi.waitFor(() => expect(GET).toHaveBeenCalled())

    expect(GET).toHaveBeenCalledWith('/diagrams', {
      params: {
        query: { limit: 20, offset: 0, kind: 'custom', created_by: 'u-1', instrument_id: 'i-1', skill_id: 's-1', concept_id: 'c-1' },
      },
    })
  })

  it('reload restarts from the first page with the filters as they are now', async () => {
    const filters = ref<DiagramFilters>({})
    GET.mockResolvedValueOnce(ok([{ diagram_id: 'd-1' }]))
    const { diagrams, isLoading, reload } = useListDiagrams(() => filters.value)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    filters.value = { kind: 'basic' }
    GET.mockResolvedValueOnce(ok([{ diagram_id: 'd-2' }]))
    await reload()

    expect(GET).toHaveBeenLastCalledWith('/diagrams', { params: { query: { limit: 20, offset: 0, kind: 'basic' } } })
    expect(diagrams.value).toEqual([{ diagram_id: 'd-2' }])
  })

  it('appends the next page on loadMore, keeping the filters', async () => {
    GET.mockResolvedValueOnce(ok([{ diagram_id: 'd-1' }], 2)).mockResolvedValueOnce(ok([{ diagram_id: 'd-2' }], 2, 1))

    const { diagrams, isLoading, loadMore } = useListDiagrams(() => ({ kind: 'basic' }))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    await loadMore()

    expect(GET).toHaveBeenLastCalledWith('/diagrams', { params: { query: { limit: 20, offset: 1, kind: 'basic' } } })
    expect(diagrams.value).toEqual([{ diagram_id: 'd-1' }, { diagram_id: 'd-2' }])
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'forbidden' }, response: { status: 403 } })

    const { diagrams, isLoading, error } = useListDiagrams()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(diagrams.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
