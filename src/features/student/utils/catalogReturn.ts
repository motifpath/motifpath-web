import type { CourseListFilterState } from '@/shared/composables/useCourseListFilters'

/** The learner catalogs whose place is kept across a visit to an item's details. */
export type CatalogKind = 'courses' | 'paths'

const STORAGE_KEY: Record<CatalogKind, string> = {
  courses: 'motifpath.catalog-return.courses.v1',
  paths: 'motifpath.catalog-return.paths.v1',
}

export interface CatalogReturn {
  /** The course or learning path whose details were opened. */
  itemId: string
  filters: CourseListFilterState
  searchText: string
  /** Number of matching cards loaded before opening the details. */
  loadedCount: number
  scrollY: number
}

type StoredCatalogReturn = CatalogReturn & { version: 1 }

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

function isStoredReturn(value: unknown): value is StoredCatalogReturn {
  if (!value || typeof value !== 'object') return false
  const stored = value as Record<string, unknown>
  return (
    stored.version === 1 &&
    typeof stored.itemId === 'string' &&
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

export function saveCatalogReturn(kind: CatalogKind, returnState: CatalogReturn) {
  const stored: StoredCatalogReturn = { ...returnState, version: 1 }
  try {
    window.localStorage.setItem(STORAGE_KEY[kind], JSON.stringify(stored))
  } catch {
    // Storage is an enhancement; navigation still works when it is unavailable.
  }
}

/**
 * Consumes the saved catalog state only when the detail page that created it
 * returns the learner to the catalog. A normal catalog visit remains fresh.
 */
export function restoreCatalogReturn(kind: CatalogKind, itemId: string): Omit<CatalogReturn, 'itemId'> | null {
  const key = STORAGE_KEY[kind]
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const stored: unknown = JSON.parse(raw)
    if (!isStoredReturn(stored)) {
      window.localStorage.removeItem(key)
      return null
    }
    if (stored.itemId !== itemId) return null

    window.localStorage.removeItem(key)
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
