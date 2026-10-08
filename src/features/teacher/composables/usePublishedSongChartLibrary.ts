import { ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApiPagedList } from '@/shared/composables/useApiPagedList'

type SongChartSummary = components['schemas']['SongChartSummary']

const SEARCH_DEBOUNCE_MS = 300

/**
 * The song charts learners can read, for a teacher to embed in a lesson: published only, as their
 * latest published revision shows them, searched by title or artist once typing pauses.
 */
export function usePublishedSongChartLibrary() {
  const searchText = ref('')
  const appliedSearch = ref('')

  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(searchText, (text) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => (appliedSearch.value = text.trim()), SEARCH_DEBOUNCE_MS)
  })

  const page = useApiPagedList<SongChartSummary>((coreApi, { limit, offset }) =>
    coreApi.GET('/song-charts', {
      params: { query: { limit, offset, status: 'published', ...(appliedSearch.value ? { q: appliedSearch.value } : {}) } },
    }),
  )
  watch(appliedSearch, () => void page.reload())

  return { charts: page.items, searchText, ...page }
}
