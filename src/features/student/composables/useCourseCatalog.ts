import { watch } from 'vue'

import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import { useCourseListFilters } from '@/shared/composables/useCourseListFilters'
import type { components } from '@/api/generated/core-domain'

type CourseCatalogEntry = components['schemas']['CourseCatalogEntry']

/**
 * The learner course catalog: one page of published courses at a time,
 * filtered server-side. Changing any filter restarts from the first page;
 * the free-text search waits for typing to pause before it does.
 */
export function useCourseCatalog() {
  const { filters, searchText, query, hasActiveFilters, clearFilters } = useCourseListFilters()

  const {
    items: courses,
    reload,
    ...page
  } = useApiPagedList<CourseCatalogEntry>((coreApi, pageRequest) =>
    coreApi.GET('/catalog/courses', { params: { query: { ...pageRequest, ...query.value } } }),
  )

  watch(query, () => void reload(), { deep: true })

  return { courses, filters, searchText, hasActiveFilters, clearFilters, retry: reload, ...page }
}
