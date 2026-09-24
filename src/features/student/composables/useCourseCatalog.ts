import { computed, onScopeDispose, reactive, ref, watch } from 'vue'

import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import type { components, operations } from '@/api/generated/core-domain'

type CourseCatalogEntry = components['schemas']['CourseCatalogEntry']
type CourseLevel = CourseCatalogEntry['level']
type CatalogQuery = NonNullable<operations['listCourses']['parameters']['query']>

/** A teacher filter, remembered with the course it was picked from — the catalog has no teacher names to show. */
export interface TeacherFilter {
  userId: string
  courseTitle: string
}

interface CatalogFilters {
  levels: CourseLevel[]
  skillIds: string[]
  conceptIds: string[]
  teacher: TeacherFilter | null
}

const SEARCH_DEBOUNCE_MS = 300

/**
 * The student course catalog: one page of published courses at a time,
 * filtered server-side. Changing any filter restarts from the first page;
 * the free-text search waits for typing to pause before it does.
 */
export function useCourseCatalog() {
  const filters = reactive<CatalogFilters>({ levels: [], skillIds: [], conceptIds: [], teacher: null })
  const searchText = ref('')
  const appliedSearch = ref('')

  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(searchText, (text) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => (appliedSearch.value = text.trim()), SEARCH_DEBOUNCE_MS)
  })
  onScopeDispose(() => clearTimeout(searchTimer))

  const query = computed(() => {
    const q: Omit<CatalogQuery, 'limit' | 'offset'> = {}
    if (appliedSearch.value) q.q = appliedSearch.value
    if (filters.levels.length) q.levels = [...filters.levels]
    if (filters.skillIds.length) q.skill_ids = [...filters.skillIds]
    if (filters.conceptIds.length) q.concept_ids = [...filters.conceptIds]
    if (filters.teacher) q.created_by = filters.teacher.userId
    return q
  })

  const {
    items: courses,
    reload,
    ...page
  } = useApiPagedList<CourseCatalogEntry>((coreApi, pageRequest) =>
    coreApi.GET('/courses', { params: { query: { ...pageRequest, ...query.value } } }),
  )

  watch(query, () => void reload(), { deep: true })

  const hasActiveFilters = computed(() => Object.keys(query.value).length > 0 || searchText.value.trim() !== '')

  function clearFilters() {
    clearTimeout(searchTimer)
    filters.levels = []
    filters.skillIds = []
    filters.conceptIds = []
    filters.teacher = null
    searchText.value = ''
    appliedSearch.value = ''
  }

  return { courses, filters, searchText, hasActiveFilters, clearFilters, retry: reload, ...page }
}
