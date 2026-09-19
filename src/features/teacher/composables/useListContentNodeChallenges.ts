import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type Challenge = components['schemas']['Challenge']

export function useListContentNodeChallenges(contentNodeId: string) {
  const { coreApi } = useApi()

  const challenges = ref<Challenge[]>([])
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/content-nodes/{content_node_id}/challenges', {
      params: { path: { content_node_id: contentNodeId } },
    })
    if (result.error || !result.data) {
      error.value = true
      challenges.value = []
    } else {
      challenges.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { challenges, isLoading, error, retry: load }
}
