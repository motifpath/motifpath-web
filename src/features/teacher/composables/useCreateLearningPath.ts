import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type CreateLearningPathRequest = components['schemas']['CreateLearningPathRequest']
type LearningPath = components['schemas']['LearningPath']

export function useCreateLearningPath() {
  const { coreApi } = useApi()

  async function createLearningPath(request: CreateLearningPathRequest): Promise<LearningPath> {
    const { data, error } = await coreApi.POST('/learning-paths', { body: request })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to create the learning path'))
    }
    return data
  }

  return { createLearningPath }
}
