import { computed, ref, shallowRef } from 'vue'

import { useApi } from '@/shared/composables/useApi'

type CoreApi = ReturnType<typeof useApi>['coreApi']

export interface PageRequest {
  limit: number
  offset: number
}

interface PageEnvelope<TItem> {
  items: TItem[]
  total: number
}

interface Options {
  /** Page size for each request. Defaults to the server's own default. */
  pageSize?: number
  /**
   * Keep fetching until every matching item is loaded. For pickers that need
   * the whole set (e.g. to resolve an item by id), not for browsable lists.
   */
  loadAll?: boolean
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

/**
 * Offset-paginated counterpart to `useApiList`, for endpoints that return an
 * `{items, total, limit, offset}` envelope. Loads the first page on setup;
 * `loadMore` appends the next one, `reload` restarts from the first page (call
 * it after changing whatever filters `perform` closes over). A response that
 * arrives after a newer `reload` has started is discarded, so fast filter
 * changes can't leave an older result on screen.
 */
export function useApiPagedList<TItem>(
  perform: (
    coreApi: CoreApi,
    page: PageRequest,
  ) => Promise<{ data?: PageEnvelope<TItem>; error?: unknown }>,
  options: Options = {},
) {
  const { coreApi } = useApi()
  const pageSize = options.loadAll ? MAX_PAGE_SIZE : (options.pageSize ?? DEFAULT_PAGE_SIZE)

  const items = shallowRef<TItem[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const error = ref(false)
  const loadMoreError = ref(false)
  const hasMore = computed(() => items.value.length < total.value)

  let generation = 0

  async function fetchPage(offset: number) {
    const result = await perform(coreApi, { limit: pageSize, offset })
    return result.error || !result.data ? null : result.data
  }

  async function reload() {
    const current = ++generation
    isLoading.value = true
    isLoadingMore.value = false
    error.value = false
    loadMoreError.value = false

    const loaded: TItem[] = []
    let knownTotal = 0
    let failed = false
    do {
      const data = await fetchPage(loaded.length)
      if (current !== generation) return
      if (!data) {
        failed = true
        break
      }
      loaded.push(...data.items)
      knownTotal = data.total
      if (data.items.length === 0) break
    } while (options.loadAll && loaded.length < knownTotal)

    items.value = failed ? [] : loaded
    total.value = failed ? 0 : knownTotal
    error.value = failed
    isLoading.value = false
  }

  async function loadMore() {
    if (isLoading.value || isLoadingMore.value || !hasMore.value) return
    const current = generation
    isLoadingMore.value = true
    loadMoreError.value = false

    const data = await fetchPage(items.value.length)
    if (current !== generation) return
    if (data) {
      items.value = [...items.value, ...data.items]
      total.value = data.total
    } else {
      loadMoreError.value = true
    }
    isLoadingMore.value = false
  }

  void reload()

  return { items, total, hasMore, isLoading, isLoadingMore, error, loadMoreError, reload, loadMore }
}
