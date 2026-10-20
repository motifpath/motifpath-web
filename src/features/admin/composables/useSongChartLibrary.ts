import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApiPagedList } from '@/shared/composables/useApiPagedList'

type SongChartSummary = components['schemas']['SongChartSummary']
type SongChartStatus = components['schemas']['SongChartStatus']

const SEARCH_DEBOUNCE_MS = 300

/**
 * The song charts admins author, most recently updated first: searched by title or artist (once
 * typing pauses) and narrowed to one status.
 */
export function useSongChartLibrary() {
  const status = ref<SongChartStatus | null>(null)
  const searchText = ref('')
  const appliedSearch = ref('')

  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(searchText, (text) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => (appliedSearch.value = text.trim()), SEARCH_DEBOUNCE_MS)
  })

  const page = useApiPagedList<SongChartSummary>((coreApi, { limit, offset }) =>
    coreApi.GET('/song-charts', {
      params: {
        query: {
          limit,
          offset,
          ...(appliedSearch.value ? { q: appliedSearch.value } : {}),
          ...(status.value ? { status: status.value } : {}),
        },
      },
    }),
  )
  watch([status, appliedSearch], () => void page.reload())

  const hasActiveFilters = computed(() => status.value !== null || appliedSearch.value !== '')

  return { charts: page.items, status, searchText, hasActiveFilters, ...page }
}
