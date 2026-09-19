import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']

export function useLearningPath(learningPathId: string) {
  const { coreApi } = useApi()

  const learningPath = ref<LearningPath | null>(null)
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/learning-paths/{learning_path_id}', {
      params: { path: { learning_path_id: learningPathId } },
    })
    if (result.error || !result.data) {
      error.value = true
      learningPath.value = null
    } else {
      learningPath.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { learningPath, isLoading, error, retry: load }
}
