import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']

export function useListContentNodes() {
  const { coreApi } = useApi()

  const contentNodes = ref<ContentNode[]>([])
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/content-nodes', {})
    if (result.error || !result.data) {
      error.value = true
      contentNodes.value = []
    } else {
      contentNodes.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { contentNodes, isLoading, error, retry: load }
}
