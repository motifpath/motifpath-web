import type { CourseListFilterState } from '@/shared/composables/useCourseListFilters'

const STORAGE_KEY = 'motifpath.course-catalog-return.v1'

export interface CourseCatalogReturn {
  courseId: string
  filters: CourseListFilterState
  searchText: string
  /** Number of matching cards loaded before opening course details. */
  loadedCount: number
  scrollY: number
}

type StoredCourseCatalogReturn = CourseCatalogReturn & { version: 1 }

function isFilterState(value: unknown): value is CourseListFilterState {
  if (!value || typeof value !== 'object') return false
  const filters = value as Record<string, unknown>
  return (
    Array.isArray(filters.levels) &&
    Array.isArray(filters.skillIds) &&
    Array.isArray(filters.conceptIds) &&
    (filters.teacher === null ||
      (typeof filters.teacher === 'object' &&
        filters.teacher !== null &&
        typeof (filters.teacher as Record<string, unknown>).user_id === 'string' &&
        typeof (filters.teacher as Record<string, unknown>).display_name === 'string')) &&
    (filters.instrumentId === null || typeof filters.instrumentId === 'string') &&
    (filters.language === null || typeof filters.language === 'string')
  )
}

function isStoredReturn(value: unknown): value is StoredCourseCatalogReturn {
  if (!value || typeof value !== 'object') return false
  const stored = value as Record<string, unknown>
  return (
    stored.version === 1 &&
    typeof stored.courseId === 'string' &&
    isFilterState(stored.filters) &&
    typeof stored.searchText === 'string' &&
    typeof stored.loadedCount === 'number' &&
    Number.isFinite(stored.loadedCount) &&
    stored.loadedCount >= 0 &&
    typeof stored.scrollY === 'number' &&
    Number.isFinite(stored.scrollY) &&
    stored.scrollY >= 0
  )
}

export function saveCourseCatalogReturn(returnState: CourseCatalogReturn) {
  const stored: StoredCourseCatalogReturn = { ...returnState, version: 1 }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage is an enhancement; navigation still works when it is unavailable.
  }
}

/**
 * Consumes the saved catalog state only when the detail page that created it
 * returns the learner to the catalog. A normal catalog visit remains fresh.
 */
export function restoreCourseCatalogReturn(courseId: string): Omit<CourseCatalogReturn, 'courseId'> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored: unknown = JSON.parse(raw)
    if (!isStoredReturn(stored)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (stored.courseId !== courseId) return null

    window.localStorage.removeItem(STORAGE_KEY)
    return {
      filters: stored.filters,
      searchText: stored.searchText,
      loadedCount: stored.loadedCount,
      scrollY: stored.scrollY,
    }
  } catch {
    return null
  }
}
