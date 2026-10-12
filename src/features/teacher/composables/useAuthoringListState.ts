import { onScopeDispose, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw } from 'vue-router'

import {
  type AuthoringListFilters,
  type AuthoringListState,
  type AuthoringSection,
  type AuthoringSort,
  type FilterKey,
  hasListQuery,
  parseListQuery,
  toListQuery,
} from '@/features/teacher/utils/authoringListQuery'

const SEARCH_DEBOUNCE_MS = 300

function storageKey(section: AuthoringSection) {
  return `motifpath.teach-list.${section}.v1`
}

function remembered(section: AuthoringSection): LocationQuery {
  try {
    const raw = window.localStorage.getItem(storageKey(section))
    const stored: unknown = raw ? JSON.parse(raw) : null
    return stored && typeof stored === 'object' ? (stored as LocationQuery) : {}
  } catch {
    return {}
  }
}

function remember(section: AuthoringSection, query: LocationQueryRaw) {
  try {
    window.localStorage.setItem(storageKey(section), JSON.stringify(query))
  } catch {
    // Remembering is a convenience; the list works the same without storage.
  }
}

function sameQuery(a: LocationQueryRaw, b: LocationQueryRaw) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * A Teach list's search, filters, sort and status chip, kept in the address so a link reopens
 * them, and remembered per section on this device so opening the list again from Teach brings
 * them back. What the address or the storage holds is read through the section's own filters,
 * so a value the section doesn't offer is dropped. The search applies once typing pauses.
 */
export function useAuthoringListState(section: AuthoringSection) {
  const route = useRoute()
  const router = useRouter()

  const initialQuery = hasListQuery(route.query) ? route.query : remembered(section)
  const state = reactive<AuthoringListState>(parseListQuery(section, initialQuery))
  const searchText = ref(state.q)

  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(searchText, (text) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => (state.q = text.trim()), SEARCH_DEBOUNCE_MS)
  })
  onScopeDispose(() => clearTimeout(searchTimer))

  function writeAddress() {
    const query = toListQuery(state)
    remember(section, query)
    if (sameQuery(query, toListQuery(parseListQuery(section, route.query)))) return
    void router.replace({ query })
  }
  writeAddress()
  watch(state, writeAddress, { deep: true })

  // The browser's own back and forward move between list states too. Opening the list again
  // without a state (from the Teach navigation) keeps the one on screen.
  watch(
    () => route.query,
    (query) => {
      if (!hasListQuery(query)) return writeAddress()
      const next = parseListQuery(section, query)
      if (sameQuery(toListQuery(next), toListQuery(state))) return
      Object.assign(state, next)
      searchText.value = next.q
    },
  )

  function setSort(sort: AuthoringSort) {
    state.sort = sort
  }

  function setStatus(status: string | null) {
    state.status = status
  }

  function setFilters(filters: AuthoringListFilters) {
    state.filters = { ...filters, skills: [...filters.skills], concepts: [...filters.concepts] }
  }

  /** Removes one filter; for skills and concepts, only the given one. */
  function removeFilter(key: FilterKey, value?: string) {
    if (key === 'skills' || key === 'concepts') {
      state.filters[key] = state.filters[key].filter((id) => id !== value)
      return
    }
    const rest = { ...state.filters }
    delete rest[key]
    state.filters = rest
  }

  function clearFilters() {
    state.filters = { skills: [], concepts: [] }
  }

  return { state, searchText, setSort, setStatus, setFilters, removeFilter, clearFilters }
}
