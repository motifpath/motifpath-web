import { ref, watch } from 'vue'

import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import { useCourseListFilters } from '@/shared/composables/useCourseListFilters'
import type { components, operations } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']
type LearningPathListQuery = NonNullable<operations['listLearningPaths']['parameters']['query']>
export type LearningPathSort = NonNullable<LearningPathListQuery['sort']>

/**
 * The learning path library a course's checkpoints are picked from: one page
 * at a time, narrowed server-side by title, author, level, skills, concepts
 * and instrument, sorted by title or by last update. The sort is not a
 * filter, so clearing the filters keeps it.
 */
export function useLearningPathLibrary() {
  const { filters, searchText, query, hasActiveFilters, clearFilters } = useCourseListFilters()
  const sort = ref<LearningPathSort>('title')

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
          ...(query.value.q ? { q: query.value.q } : {}),
          ...(query.value.levels ? { levels: query.value.levels } : {}),
          ...(query.value.skill_ids ? { skill_ids: query.value.skill_ids } : {}),
          ...(query.value.concept_ids ? { concept_ids: query.value.concept_ids } : {}),
          ...(query.value.instrument_id ? { instrument_id: query.value.instrument_id } : {}),
          ...(query.value.created_by ? { created_by: query.value.created_by } : {}),
        },
      },
    }),
  )

  watch([query, sort], () => void reload(), { deep: true })

  return { paths, sort, filters, searchText, hasActiveFilters, clearFilters, retry: reload, ...page }
}
