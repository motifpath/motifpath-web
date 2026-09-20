import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'

type CoreApi = ReturnType<typeof useApi>['coreApi']

/**
 * Generic factory for a "fetch a single item by id on setup, expose
 * loading/error/retry" composable -- the single-item counterpart to
 * useApiList's ref/loading/error/auto-load/retry contract.
 */
export function useApiItem<TItem>(perform: (coreApi: CoreApi) => Promise<{ data?: TItem; error?: unknown }>) {
  const { coreApi } = useApi()

  const item = ref<TItem | null>(null)
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await perform(coreApi)
    if (result.error || !result.data) {
      error.value = true
      item.value = null
    } else {
      item.value = result.data as typeof item.value
    }

    isLoading.value = false
  }

  void load()

  return { item, isLoading, error, retry: load }
}
