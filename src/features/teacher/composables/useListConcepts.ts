import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type Concept = components['schemas']['Concept']

export function useListConcepts() {
  const { coreApi } = useApi()

  const concepts = ref<Concept[]>([])
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/concepts', {})
    if (result.error || !result.data) {
      error.value = true
      concepts.value = []
    } else {
      concepts.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { concepts, isLoading, error, retry: load }
}
