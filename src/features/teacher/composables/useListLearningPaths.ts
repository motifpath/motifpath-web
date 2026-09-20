import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']

export function useListLearningPaths() {
  const {
    items: learningPaths,
    isLoading,
    error,
    retry,
  } = useApiList<LearningPath>((coreApi) => coreApi.GET('/learning-paths', {}))

  return { learningPaths, isLoading, error, retry }
}
