import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type ReplaceLearningPathRequest = components['schemas']['ReplaceLearningPathRequest']
type LearningPath = components['schemas']['LearningPath']

export function useReplaceLearningPath() {
  const { coreApi } = useApi()

  async function replaceLearningPath(
    learningPathId: string,
    request: ReplaceLearningPathRequest,
  ): Promise<LearningPath> {
    const { data, error } = await coreApi.PUT('/learning-paths/{learning_path_id}', {
      params: { path: { learning_path_id: learningPathId } },
      body: request,
    })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to replace the learning path'))
    }
    return data
  }

  return { replaceLearningPath }
}
