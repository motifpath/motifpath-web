import { computed, onScopeDispose, reactive, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'

type CourseLevel = components['schemas']['CourseCatalogEntry']['level']
type UserRef = components['schemas']['UserRef']

export interface CourseListFilterState {
  levels: CourseLevel[]
  skillIds: string[]
  conceptIds: string[]
  teacher: UserRef | null
  /** An instrument; items for every instrument always match. */
  instrumentId: string | null
  /** A Language.code; only the course lists offer it. */
  language: string | null
}

/** The filter query both course lists (catalog and authoring) send. */
export interface CourseListFilterQuery {
  q?: string
  levels?: CourseLevel[]
  skill_ids?: string[]
  concept_ids?: string[]
  created_by?: string
  instrument_id?: string
  language?: string
}

const SEARCH_DEBOUNCE_MS = 300

/**
 * The filters shared by the learner catalog, the authoring course list and
 * the learning path library: levels, skills, concepts, a teacher, an
 * instrument, a language and a free-text search that waits for typing to
 * pause. `query` is what to send; `hasActiveFilters` also counts
 * text still being typed, so a "no matches" state appears without waiting.
 */
export function useCourseListFilters(initial: Partial<CourseListFilterState> = {}) {
  const filters = reactive<CourseListFilterState>({
    levels: [],
    skillIds: [],
    conceptIds: [],
    teacher: null,
    instrumentId: null,
    language: null,
    ...initial,
  })
  const searchText = ref('')
  const appliedSearch = ref('')

  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(searchText, (text) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => (appliedSearch.value = text.trim()), SEARCH_DEBOUNCE_MS)
  })
  onScopeDispose(() => clearTimeout(searchTimer))

  const query = computed(() => {
    const q: CourseListFilterQuery = {}
    if (appliedSearch.value) q.q = appliedSearch.value
    if (filters.levels.length) q.levels = [...filters.levels]
    if (filters.skillIds.length) q.skill_ids = [...filters.skillIds]
    if (filters.conceptIds.length) q.concept_ids = [...filters.conceptIds]
    if (filters.teacher) q.created_by = filters.teacher.user_id
    if (filters.instrumentId) q.instrument_id = filters.instrumentId
    if (filters.language) q.language = filters.language
    return q
  })

  const hasActiveFilters = computed(
    () => Object.keys(query.value).length > 0 || searchText.value.trim() !== '',
  )

  function clearFilters() {
    clearTimeout(searchTimer)
    filters.levels = []
    filters.skillIds = []
    filters.conceptIds = []
    filters.teacher = null
    filters.instrumentId = null
    filters.language = null
    searchText.value = ''
    appliedSearch.value = ''
  }

  return { filters, searchText, query, hasActiveFilters, clearFilters }
}
