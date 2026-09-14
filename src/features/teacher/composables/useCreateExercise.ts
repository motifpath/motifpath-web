import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type CreateExerciseRequest = components['schemas']['CreateExerciseRequest']
type Exercise = components['schemas']['Exercise']

export function useCreateExercise() {
  const { coreApi } = useApi()

  async function createExercise(request: CreateExerciseRequest): Promise<Exercise> {
    const { data, error } = await coreApi.POST('/exercises', { body: request })
    if (!data) {
      throw new Error(error?.message ?? 'Failed to create the exercise')
    }
    return data
  }

  return { createExercise }
}
