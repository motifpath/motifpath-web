import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type ReplaceLearningPathRequest = components['schemas']['ReplaceLearningPathRequest']
type LearningPath = components['schemas']['LearningPath']

export function useReplaceLearningPath() {
  const replaceLearningPath = useApiMutation<[string, ReplaceLearningPathRequest], LearningPath>(
    (coreApi, learningPathId, request) =>
      coreApi.PUT('/learning-paths/{learning_path_id}', {
        params: { path: { learning_path_id: learningPathId } },
        body: request,
      }),
    'Failed to replace the learning path',
  )

  return { replaceLearningPath }
}
