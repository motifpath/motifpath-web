import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: {}, eventApi: {} }),
}))

import { useApiPagedList } from '@/shared/composables/useApiPagedList'

type Item = { id: string }

function page(items: Item[], total: number, offset = 0, limit = 20) {
  return { data: { items, total, limit, offset }, error: undefined }
}

function items(from: number, count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({ id: `item-${from + i}` }))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

describe('useApiPagedList', () => {
  it('loads the first page on creation with the default page size', async () => {
    const perform = vi.fn().mockResolvedValueOnce(page(items(0, 2), 2))

    const list = useApiPagedList<Item>(perform)
    expect(list.isLoading.value).toBe(true)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))

    expect(perform).toHaveBeenCalledWith(expect.anything(), { limit: 20, offset: 0 })
    expect(list.items.value).toEqual(items(0, 2))
    expect(list.total.value).toBe(2)
    expect(list.hasMore.value).toBe(false)
    expect(list.error.value).toBe(false)
  })

  it('appends the next page on loadMore while more items remain', async () => {
    const perform = vi
      .fn()
      .mockResolvedValueOnce(page(items(0, 20), 25))
      .mockResolvedValueOnce(page(items(20, 5), 25, 20))

    const list = useApiPagedList<Item>(perform)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))
    expect(list.hasMore.value).toBe(true)

    await list.loadMore()

    expect(perform).toHaveBeenLastCalledWith(expect.anything(), { limit: 20, offset: 20 })
    expect(list.items.value).toEqual(items(0, 25))
    expect(list.hasMore.value).toBe(false)
  })

  it('keeps the loaded items and flags loadMoreError when a later page fails', async () => {
    const perform = vi
      .fn()
      .mockResolvedValueOnce(page(items(0, 20), 25))
      .mockResolvedValueOnce({ data: undefined, error: { message: 'boom' } })

    const list = useApiPagedList<Item>(perform)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))
    await list.loadMore()

    expect(list.items.value).toEqual(items(0, 20))
    expect(list.error.value).toBe(false)
    expect(list.loadMoreError.value).toBe(true)
    expect(list.isLoadingMore.value).toBe(false)
  })

  it('sets error and an empty list when the first page fails', async () => {
    const perform = vi.fn().mockResolvedValueOnce({ data: undefined, error: { message: 'boom' } })

    const list = useApiPagedList<Item>(perform)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))

    expect(list.items.value).toEqual([])
    expect(list.total.value).toBe(0)
    expect(list.error.value).toBe(true)
  })

  it('restarts from the first page on reload', async () => {
    const perform = vi
      .fn()
      .mockResolvedValueOnce(page(items(0, 20), 25))
      .mockResolvedValueOnce(page(items(20, 5), 25, 20))
      .mockResolvedValueOnce(page(items(100, 1), 1))

    const list = useApiPagedList<Item>(perform)
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))
    await list.loadMore()
    await list.reload()

    expect(perform).toHaveBeenLastCalledWith(expect.anything(), { limit: 20, offset: 0 })
    expect(list.items.value).toEqual(items(100, 1))
    expect(list.total.value).toBe(1)
  })

  it('ignores a slower, superseded response when reload is called mid-flight', async () => {
    const first = deferred<ReturnType<typeof page>>()
    const perform = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(page(items(50, 1), 1))

    const list = useApiPagedList<Item>(perform)
    await list.reload()
    first.resolve(page(items(0, 3), 3))
    await first.promise
    await Promise.resolve()

    expect(list.items.value).toEqual(items(50, 1))
    expect(list.total.value).toBe(1)
    expect(list.isLoading.value).toBe(false)
  })

  it('fetches every page with the maximum page size when loadAll is set', async () => {
    const perform = vi
      .fn()
      .mockResolvedValueOnce(page(items(0, 100), 150, 0, 100))
      .mockResolvedValueOnce(page(items(100, 50), 150, 100, 100))

    const list = useApiPagedList<Item>(perform, { loadAll: true })
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))

    expect(perform).toHaveBeenNthCalledWith(1, expect.anything(), { limit: 100, offset: 0 })
    expect(perform).toHaveBeenNthCalledWith(2, expect.anything(), { limit: 100, offset: 100 })
    expect(list.items.value).toHaveLength(150)
    expect(list.hasMore.value).toBe(false)
  })

  it('stops loadAll on an empty page even if total claims more remain', async () => {
    const perform = vi
      .fn()
      .mockResolvedValueOnce(page(items(0, 100), 300, 0, 100))
      .mockResolvedValueOnce(page([], 300, 100, 100))

    const list = useApiPagedList<Item>(perform, { loadAll: true })
    await vi.waitFor(() => expect(list.isLoading.value).toBe(false))

    expect(perform).toHaveBeenCalledTimes(2)
    expect(list.items.value).toHaveLength(100)
  })
})
