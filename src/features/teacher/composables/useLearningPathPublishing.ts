import { useApi } from '@/shared/composables/useApi'
import { useApiMutation } from '@/shared/composables/useApiMutation'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']
type NotPublishable = components['schemas']['LearningPathNotPublishableError']

export type PublishResult =
  | { outcome: 'published'; learningPath: LearningPath }
  | {
      outcome: 'not-publishable'
      missing: NotPublishable['missing']
      unpublishedContentNodeIds: string[]
    }

function isNotPublishable(error: unknown): error is NotPublishable {
  return typeof error === 'object' && error !== null && 'missing' in error && Array.isArray(error.missing)
}

/** An admin's publish and unpublish actions on a learning path. */
export function useLearningPathPublishing() {
  const { coreApi } = useApi()

  /**
   * Resolves `not-publishable` with what the path still lacks instead of
   * throwing, since the author fixes those in the editor.
   */
  async function publishLearningPath(learningPathId: string): Promise<PublishResult> {
    const { data, error } = await coreApi.POST('/learning-paths/{learning_path_id}/publish', {
      params: { path: { learning_path_id: learningPathId } },
    })
    if (data) return { outcome: 'published', learningPath: data }
    if (isNotPublishable(error)) {
      return {
        outcome: 'not-publishable',
        missing: error.missing,
        unpublishedContentNodeIds: error.unpublished_content_node_ids ?? [],
      }
    }
    throw new Error(describeApiError(error, 'Failed to publish the learning path'))
  }

  const unpublishLearningPath = useApiMutation<[string], LearningPath>(
    (api, learningPathId) =>
      api.POST('/learning-paths/{learning_path_id}/unpublish', {
        params: { path: { learning_path_id: learningPathId } },
      }),
    'Failed to unpublish the learning path',
  )

  return { publishLearningPath, unpublishLearningPath }
}
