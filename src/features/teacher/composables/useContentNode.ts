import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']

export function useContentNode(contentNodeId: string) {
  const { coreApi } = useApi()

  const contentNode = ref<ContentNode | null>(null)
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/content-nodes/{content_node_id}', {
      params: { path: { content_node_id: contentNodeId } },
    })
    if (result.error || !result.data) {
      error.value = true
      contentNode.value = null
    } else {
      contentNode.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { contentNode, isLoading, error, retry: load }
}
