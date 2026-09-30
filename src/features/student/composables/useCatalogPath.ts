import { useApiItem } from '@/shared/composables/useApiItem'
import type { components } from '@/api/generated/core-domain'

type PathDetail = components['schemas']['PathDetail']

/** A published learning path with its outline, as a prospective learner sees it. */
export function useCatalogPath(learningPathId: string) {
  const { item: path, isLoading, error, notFound, retry } = useApiItem<PathDetail>((coreApi) =>
    coreApi.GET('/catalog/paths/{learning_path_id}', { params: { path: { learning_path_id: learningPathId } } }),
  )

  return { path, isLoading, error, notFound, retry }
}
