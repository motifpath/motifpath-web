import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

export function useExercise(exerciseId: string) {
  const { coreApi } = useApi()

  const exercise = ref<Exercise | null>(null)
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/exercises/{exercise_id}', {
      params: { path: { exercise_id: exerciseId } },
    })
    if (result.error || !result.data) {
      error.value = true
      exercise.value = null
    } else {
      exercise.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { exercise, isLoading, error, retry: load }
}
