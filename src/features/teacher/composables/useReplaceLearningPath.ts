import { isNotPublishable, LearningPathNotPublishableError } from '@/features/teacher/composables/useLearningPathPublishing'
import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type ReplaceLearningPathRequest = components['schemas']['ReplaceLearningPathRequest']
type LearningPath = components['schemas']['LearningPath']

export function useReplaceLearningPath() {
  const { coreApi } = useApi()

  /**
   * Throws LearningPathNotPublishableError, carrying what would be missing,
   * when the path is published and the change would leave it unpublishable.
   */
  async function replaceLearningPath(learningPathId: string, request: ReplaceLearningPathRequest): Promise<LearningPath> {
    const { data, error } = await coreApi.PUT('/learning-paths/{learning_path_id}', {
      params: { path: { learning_path_id: learningPathId } },
      body: request,
    })
    if (data) return data
    if (isNotPublishable(error)) {
      throw new LearningPathNotPublishableError(
        describeApiError(error, 'Failed to replace the learning path'),
        error.missing,
        error.unpublished_content_node_ids ?? [],
      )
    }
    throw new Error(describeApiError(error, 'Failed to replace the learning path'))
  }

  return { replaceLearningPath }
}
