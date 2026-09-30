import { ref, watch } from 'vue'

import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import { useCourseListFilters } from '@/shared/composables/useCourseListFilters'
import type { components, operations } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']
type LearningPathListQuery = NonNullable<operations['listLearningPaths']['parameters']['query']>
export type LearningPathSort = NonNullable<LearningPathListQuery['sort']>
export type LearningPathStatus = LearningPath['status']

/**
 * The learning path library, one page at a time: narrowed server-side by
 * title, author, level, skills, concepts, instrument, language and status,
 * and sorted by title or by last update. The sort and the status are not
 * filters, so clearing the filters keeps them.
 */
export function useLearningPathLibrary() {
  const { filters, searchText, query, hasActiveFilters, clearFilters } = useCourseListFilters()
  const sort = ref<LearningPathSort>('title')
  const status = ref<LearningPathStatus | null>(null)

  const {
    items: paths,
    reload,
    ...page
  } = useApiPagedList<LearningPath>((coreApi, pageRequest) =>
    coreApi.GET('/learning-paths', {
      params: {
        query: {
          ...pageRequest,
          sort: sort.value,
          ...query.value,
          ...(status.value ? { status: status.value } : {}),
        },
      },
    }),
  )

  watch([query, sort, status], () => void reload(), { deep: true })

  return { paths, sort, status, filters, searchText, hasActiveFilters, clearFilters, retry: reload, ...page }
}
