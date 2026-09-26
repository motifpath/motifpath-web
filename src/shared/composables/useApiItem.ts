import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'

type CoreApi = ReturnType<typeof useApi>['coreApi']

/**
 * Generic factory for a "fetch a single item by id on setup, expose
 * loading/error/retry" composable -- the single-item counterpart to
 * useApiList's ref/loading/error/auto-load/retry contract. `notFound` tells a
 * 404 apart from any other failure, for pages that show "not found" instead
 * of a retry.
 */
export function useApiItem<TItem>(
  perform: (coreApi: CoreApi) => Promise<{ data?: TItem; error?: unknown; response?: Response }>,
) {
  const { coreApi } = useApi()

  const item = ref<TItem | null>(null)
  const isLoading = ref(false)
  const error = ref(false)
  const notFound = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false
    notFound.value = false

    const result = await perform(coreApi)
    if (result.error || !result.data) {
      error.value = true
      notFound.value = result.response?.status === 404
      item.value = null
    } else {
      item.value = result.data as typeof item.value
    }

    isLoading.value = false
  }

  void load()

  return { item, isLoading, error, notFound, retry: load }
}
