import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

export function useListExercises() {
  const { coreApi } = useApi()

  const exercises = ref<Exercise[]>([])
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/exercises', {})
    if (result.error || !result.data) {
      error.value = true
      exercises.value = []
    } else {
      exercises.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { exercises, isLoading, error, retry: load }
}
