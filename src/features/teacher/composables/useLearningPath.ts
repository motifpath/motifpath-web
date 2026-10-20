import { useApiItem } from '@/shared/composables/useApiItem'
import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']

export function useLearningPath(learningPathId: string) {
  const {
    item: learningPath,
    isLoading,
    error,
    retry,
  } = useApiItem<LearningPath>((coreApi) =>
    coreApi.GET('/learning-paths/{learning_path_id}', {
      params: { path: { learning_path_id: learningPathId } },
    }),
  )

  return { learningPath, isLoading, error, retry }
}
