import { watch } from 'vue'

import { i18n, toApiLanguageCode } from '@/i18n'
import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import { useCourseListFilters } from '@/shared/composables/useCourseListFilters'
import type { CourseListFilterInitialState } from '@/shared/composables/useCourseListFilters'
import type { components } from '@/api/generated/core-domain'

type PathCatalogEntry = components['schemas']['PathCatalogEntry']

/**
 * The learner path catalog: one page of published learning paths at a time,
 * filtered server-side. Like the course catalog, it starts at paths in the
 * learner's own language, which they can clear to see every path.
 */
export function usePathCatalog(initial: CourseListFilterInitialState = {}) {
  const { filters, searchText, query, hasActiveFilters, clearFilters } = useCourseListFilters({
    language: toApiLanguageCode(i18n.global.locale.value),
    ...initial,
  })

  const {
    items: paths,
    reload,
    ...page
  } = useApiPagedList<PathCatalogEntry>((coreApi, pageRequest) =>
    coreApi.GET('/catalog/paths', { params: { query: { ...pageRequest, ...query.value } } }),
  )

  watch(query, () => void reload(), { deep: true })

  return { paths, filters, searchText, hasActiveFilters, clearFilters, retry: reload, ...page }
}
