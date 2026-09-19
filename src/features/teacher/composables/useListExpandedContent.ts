import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

export function useListExpandedContent(contentNodeId: string) {
  const { coreApi } = useApi()

  const items = ref<ExpandedContent[]>([])
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/content-nodes/{content_node_id}/expanded-content', {
      params: { path: { content_node_id: contentNodeId } },
    })
    if (result.error || !result.data) {
      error.value = true
      items.value = []
    } else {
      items.value = result.data.items
    }

    isLoading.value = false
  }

  void load()

  return { items, isLoading, error, retry: load }
}
