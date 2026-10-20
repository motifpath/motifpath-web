import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type UpdateExerciseRequest = components['schemas']['UpdateExerciseRequest']
type Exercise = components['schemas']['Exercise']

export function useUpdateExercise() {
  const updateExercise = useApiMutation<[string, UpdateExerciseRequest], Exercise>(
    (coreApi, exerciseId, request) =>
      coreApi.PUT('/exercises/{exercise_id}', {
        params: { path: { exercise_id: exerciseId } },
        body: request,
      }),
    'Failed to update the exercise',
  )

  return { updateExercise }
}
