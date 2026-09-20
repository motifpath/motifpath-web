import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type CreateExerciseRequest = components['schemas']['CreateExerciseRequest']
type Exercise = components['schemas']['Exercise']

export function useCreateExercise() {
  const createExercise = useApiMutation<[CreateExerciseRequest], Exercise>(
    (coreApi, request) => coreApi.POST('/exercises', { body: request }),
    'Failed to create the exercise',
  )

  return { createExercise }
}
