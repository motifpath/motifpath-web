import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListExercises } from '@/features/teacher/composables/useListExercises'

function ok(items: unknown[], total = items.length, offset = 0, limit = 20) {
  return { data: { items, total, limit, offset }, error: undefined, response: { status: 200 } }
}

describe('useListExercises', () => {
  beforeEach(() => GET.mockReset())

  it('loads the first page on creation', async () => {
    const page = [{ exercise_id: 'x-1' }]
    GET.mockResolvedValueOnce(ok(page, 30))

    const { exercises: result, total, hasMore, isLoading, error } = useListExercises()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/exercises', { params: { query: { limit: 20, offset: 0 } } })
    expect(result.value).toEqual(page)
    expect(total.value).toBe(30)
    expect(hasMore.value).toBe(true)
    expect(error.value).toBe(false)
  })

  it('appends the next page on loadMore', async () => {
    GET.mockResolvedValueOnce(ok([{ exercise_id: 'x-1' }], 2)).mockResolvedValueOnce(ok([{ exercise_id: 'x-2' }], 2, 1))

    const { exercises: result, isLoading, loadMore } = useListExercises()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    await loadMore()

    expect(GET).toHaveBeenLastCalledWith('/exercises', { params: { query: { limit: 20, offset: 1 } } })
    expect(result.value).toEqual([{ exercise_id: 'x-1' }, { exercise_id: 'x-2' }])
  })

  it('fetches every page when loadAll is set', async () => {
    GET.mockResolvedValueOnce(ok([{ exercise_id: 'x-1' }], 2, 0, 100)).mockResolvedValueOnce(ok([{ exercise_id: 'x-2' }], 2, 1, 100))

    const { exercises: result, isLoading } = useListExercises({ loadAll: true })
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/exercises', { params: { query: { limit: 100, offset: 0 } } })
    expect(result.value).toEqual([{ exercise_id: 'x-1' }, { exercise_id: 'x-2' }])
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { exercises: result, isLoading, error } = useListExercises()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(result.value).toEqual([])
    expect(error.value).toBe(true)
  })

  it('retry re-fetches from the first page', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const { exercises: result, isLoading, error, retry } = useListExercises()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    GET.mockResolvedValueOnce(ok([{ exercise_id: 'x-1' }]))
    await retry()

    expect(error.value).toBe(false)
    expect(result.value).toEqual([{ exercise_id: 'x-1' }])
  })
})
