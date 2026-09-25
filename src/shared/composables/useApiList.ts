import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'

type CoreApi = ReturnType<typeof useApi>['coreApi']

/**
 * Generic factory for a "fetch a list on setup, expose loading/error/retry"
 * composable, for endpoints that return a bare array (paginated endpoints use
 * `useApiPagedList`). `perform` makes the actual typed openapi-fetch GET call —
 * this only centralizes the shared ref/loading/error/auto-load/retry
 * contract every list composable in this codebase follows. Args are
 * captured once, at composable-construction time, matching every existing
 * call site (a view that needs to react to an id changing re-instantiates
 * the composable itself, it doesn't rely on this factory being reactive).
 */
export function useApiList<TItem, TArgs extends unknown[] = []>(
  perform: (coreApi: CoreApi, ...args: TArgs) => Promise<{ data?: TItem[]; error?: unknown }>,
  ...args: TArgs
) {
  const { coreApi } = useApi()

  const items = ref<TItem[]>([])
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await perform(coreApi, ...args)
    if (result.error || !result.data) {
      error.value = true
      items.value = []
    } else {
      items.value = result.data as typeof items.value
    }

    isLoading.value = false
  }

  void load()

  return { items, isLoading, error, retry: load }
}
