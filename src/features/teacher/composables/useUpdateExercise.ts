import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type UpdateExerciseRequest = components['schemas']['UpdateExerciseRequest']
type Exercise = components['schemas']['Exercise']

export function useUpdateExercise() {
  const { coreApi } = useApi()

  async function updateExercise(exerciseId: string, request: UpdateExerciseRequest): Promise<Exercise> {
    const { data, error } = await coreApi.PUT('/exercises/{exercise_id}', {
      params: { path: { exercise_id: exerciseId } },
      body: request,
    })
    if (!data) {
      throw new Error(error?.message ?? 'Failed to update the exercise')
    }
    return data
  }

  return { updateExercise }
}
