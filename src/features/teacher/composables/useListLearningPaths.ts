import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']

export function useListLearningPaths() {
  const { coreApi } = useApi()

  const learningPaths = ref<LearningPath[]>([])
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/learning-paths', {})
    if (result.error || !result.data) {
      error.value = true
      learningPaths.value = []
    } else {
      learningPaths.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { learningPaths, isLoading, error, retry: load }
}
