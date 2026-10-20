import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

import {
  type DiscoverFilters,
  type DiscoverState,
  hasDiscoverQuery,
  parseDiscoverQuery,
  toDiscoverQuery,
} from '@/features/student/utils/discoverQuery'
import { i18n, toApiLanguageCode } from '@/i18n'

export type DiscoverSegment = 'courses' | 'paths'

/** The route of each segment; the segment lives in the address as its route. */
export const SEGMENT_ROUTE: Record<DiscoverSegment, 'course-catalog' | 'path-catalog'> = {
  courses: 'course-catalog',
  paths: 'path-catalog',
}

const SEARCH_DEBOUNCE_MS = 300

function sameQuery(a: LocationQueryRaw, b: LocationQueryRaw) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Discover's segment, search and filters, kept in the address so Back from a detail and a shared
 * link reopen the same list. Both segments share the search and filters. A Discover opened with
 * nothing in its address starts on the app's language, as a filter the student can remove. The
 * search applies once typing pauses.
 */
export function useDiscoverState() {
  const route = useRoute()
  const router = useRouter()

  const initial = parseDiscoverQuery(route.query)
  if (!hasDiscoverQuery(route.query)) initial.filters.language = toApiLanguageCode(i18n.global.locale.value)
  const state = reactive<DiscoverState>(initial)
  const searchText = ref(state.q)

  const segment = computed<DiscoverSegment>(() => (route.name === SEGMENT_ROUTE.paths ? 'paths' : 'courses'))

  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(searchText, (text) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => (state.q = text.trim()), SEARCH_DEBOUNCE_MS)
  })
  onScopeDispose(() => clearTimeout(searchTimer))

  // Only a segment's own address holds Discover's state; any other route is somewhere else.
  const onDiscover = () => route.name === SEGMENT_ROUTE.courses || route.name === SEGMENT_ROUTE.paths

  function writeAddress() {
    if (!onDiscover()) return
    const query = toDiscoverQuery(state)
    const onlyOwnKeys = Object.keys(route.query).every((key) => key in query)
    if (onlyOwnKeys && sameQuery(query, toDiscoverQuery(parseDiscoverQuery(route.query)))) return
    void router.replace({ query })
  }
  writeAddress()
  watch(state, writeAddress, { deep: true })

  // The browser's back and forward move between lists too.
  watch(
    () => route.query,
    (query) => {
      if (!onDiscover()) return
      const next = parseDiscoverQuery(query)
      if (sameQuery(toDiscoverQuery(next), toDiscoverQuery(state))) return
      Object.assign(state, next)
      searchText.value = next.q
    },
  )

  // Switching replaces the entry, so Back leaves Discover instead of stepping through segments.
  function setSegment(next: DiscoverSegment) {
    if (next === segment.value) return
    void router.replace({ name: SEGMENT_ROUTE[next], query: toDiscoverQuery(state) })
  }

  function setFilters(filters: DiscoverFilters) {
    state.filters = { ...filters, levels: [...filters.levels], skills: [...filters.skills], concepts: [...filters.concepts] }
  }

  /** Removes one filter; for levels, skills and concepts, only the given one. */
  function removeFilter(key: keyof DiscoverFilters, value?: string) {
    if (key === 'levels') state.filters.levels = state.filters.levels.filter((level) => level !== value)
    else if (key === 'skills' || key === 'concepts') state.filters[key] = state.filters[key].filter((id) => id !== value)
    else {
      const rest = { ...state.filters }
      delete rest[key]
      state.filters = rest
    }
  }

  /** Removes every filter; the search stays. */
  function clearFilters() {
    state.filters = { levels: [], skills: [], concepts: [] }
  }

  return { state, searchText, segment, setSegment, setFilters, removeFilter, clearFilters }
}
