import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']

export function useListLearningPaths(options: { loadAll?: boolean } = {}) {
  const { items: learningPaths, reload: retry, ...rest } = useApiPagedList<LearningPath>(
    (coreApi, page) => coreApi.GET('/learning-paths', { params: { query: page } }),
    options,
  )

  return { learningPaths, retry, ...rest }
}
