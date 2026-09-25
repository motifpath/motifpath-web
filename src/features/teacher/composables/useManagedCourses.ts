import { ref, watch } from 'vue'

import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import { useCourseListFilters } from '@/shared/composables/useCourseListFilters'
import type { components } from '@/api/generated/core-domain'

type CourseCatalogEntry = components['schemas']['CourseCatalogEntry']
export type CourseStatus = NonNullable<CourseCatalogEntry['status']>

/**
 * The authoring course list for teachers and admins: every status unless
 * one is picked, with the same server-side filters as the catalog. The
 * server scopes a teacher to their own courses. The status is a tab rather
 * than a filter, so clearing the filters keeps it.
 */
export function useManagedCourses() {
  const { filters, searchText, query, hasActiveFilters, clearFilters } = useCourseListFilters()
  const status = ref<CourseStatus | null>(null)

  const {
    items: courses,
    reload,
    ...page
  } = useApiPagedList<CourseCatalogEntry>((coreApi, pageRequest) =>
    coreApi.GET('/courses', {
      params: {
        query: {
          ...pageRequest,
          ...query.value,
          ...(status.value ? { status: status.value } : {}),
        },
      },
    }),
  )

  watch([query, status], () => void reload(), { deep: true })

  return {
    courses,
    status,
    filters,
    searchText,
    hasActiveFilters,
    clearFilters,
    retry: reload,
    ...page,
  }
}
