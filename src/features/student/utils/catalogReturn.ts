/** The learner catalogs whose place is kept across a visit to an item's details. */
export type CatalogKind = 'courses' | 'paths'

/** A Discover address's query: its search and filters. */
export type CatalogQuery = Record<string, string | string[]>

const STORAGE_KEY: Record<CatalogKind, string> = {
  courses: 'motifpath.catalog-return.courses.v2',
  paths: 'motifpath.catalog-return.paths.v2',
}
const OLDER_KEYS: Record<CatalogKind, string> = {
  courses: 'motifpath.catalog-return.courses.v1',
  paths: 'motifpath.catalog-return.paths.v1',
}

export interface CatalogReturn {
  /** The course or learning path whose details were opened. */
  itemId: string
  /** The Discover address the details were opened from. */
  query: CatalogQuery
  /** Number of matching items loaded before opening the details. */
  loadedCount: number
  scrollY: number
}

type StoredCatalogReturn = CatalogReturn & { version: 2 }

function isQuery(value: unknown): value is CatalogQuery {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every(
    (v) => typeof v === 'string' || (Array.isArray(v) && v.every((item) => typeof item === 'string')),
  )
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isStoredReturn(value: unknown): value is StoredCatalogReturn {
  if (!value || typeof value !== 'object') return false
  const stored = value as Record<string, unknown>
  return (
    stored.version === 2 &&
    typeof stored.itemId === 'string' &&
    isQuery(stored.query) &&
    isCount(stored.loadedCount) &&
    isCount(stored.scrollY)
  )
}

function read(kind: CatalogKind, itemId: string): StoredCatalogReturn | null {
  try {
    window.localStorage.removeItem(OLDER_KEYS[kind])
    const raw = window.localStorage.getItem(STORAGE_KEY[kind])
    if (!raw) return null
    const stored: unknown = JSON.parse(raw)
    if (!isStoredReturn(stored)) {
      window.localStorage.removeItem(STORAGE_KEY[kind])
      return null
    }
    return stored.itemId === itemId ? stored : null
  } catch {
    return null
  }
}

export function saveCatalogReturn(kind: CatalogKind, returnState: CatalogReturn) {
  const stored: StoredCatalogReturn = { ...returnState, version: 2 }
  try {
    window.localStorage.setItem(STORAGE_KEY[kind], JSON.stringify(stored))
  } catch {
    // Storage is an enhancement; navigation still works when it is unavailable.
  }
}

/** The Discover address an item's details were opened from, for their way back. */
export function catalogReturnQuery(kind: CatalogKind, itemId: string): CatalogQuery | null {
  return read(kind, itemId)?.query ?? null
}

/**
 * Consumes the saved place only when the detail page that created it returns the learner to
 * Discover. A normal Discover visit stays fresh.
 */
export function restoreCatalogReturn(
  kind: CatalogKind,
  itemId: string,
): Pick<CatalogReturn, 'loadedCount' | 'scrollY'> | null {
  const stored = read(kind, itemId)
  if (!stored) return null
  try {
    window.localStorage.removeItem(STORAGE_KEY[kind])
  } catch {
    // Without storage there is nothing to consume.
  }
  return { loadedCount: stored.loadedCount, scrollY: stored.scrollY }
}

const CATALOG_ROUTE: Record<CatalogKind, 'course-catalog' | 'path-catalog'> = {
  courses: 'course-catalog',
  paths: 'path-catalog',
}
const RETURN_QUERY: Record<CatalogKind, 'returnFromCourse' | 'returnFromPath'> = {
  courses: 'returnFromCourse',
  paths: 'returnFromPath',
}

/**
 * A detail's way back to Discover: to the list it was opened from, with its search and filters,
 * naming the item so Discover can return to its place; or, when it wasn't opened from Discover,
 * to a fresh one.
 */
export function discoverBackLink(kind: CatalogKind, itemId: string) {
  const query = catalogReturnQuery(kind, itemId)
  if (!query) return { name: CATALOG_ROUTE[kind] }
  return { name: CATALOG_ROUTE[kind], query: { ...query, [RETURN_QUERY[kind]]: itemId } }
}
