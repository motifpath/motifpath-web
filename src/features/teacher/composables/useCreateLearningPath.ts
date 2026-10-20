import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type CreateLearningPathRequest = components['schemas']['CreateLearningPathRequest']
type LearningPath = components['schemas']['LearningPath']

export function useCreateLearningPath() {
  const createLearningPath = useApiMutation<[CreateLearningPathRequest], LearningPath>(
    (coreApi, request) => coreApi.POST('/learning-paths', { body: request }),
    'Failed to create the learning path',
  )

  return { createLearningPath }
}
