import { onScopeDispose, ref, watch } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type UserRef = components['schemas']['UserRef']

const SEARCH_DEBOUNCE_MS = 300

/**
 * Which course list the creators belong to: the learner catalog (published
 * courses, the same for everyone) or the caller's authoring list.
 */
export type CourseCreatorsScope = 'catalog' | 'managed'

const ENDPOINT = { catalog: '/catalog/creators', managed: '/courses/creators' } as const

/**
 * The teachers behind a course list, for its teacher filter. The list is
 * complete (never paged) and comes back in name order; typing a name
 * narrows it server-side once typing pauses.
 */
export function useCourseCreators(scope: CourseCreatorsScope = 'catalog') {
  const { coreApi } = useApi()

  const creators = ref<UserRef[]>([])
  const nameQuery = ref('')
  const isLoading = ref(false)
  const error = ref(false)

  let appliedQuery = ''
  // Only the newest request may write its result — an older search that
  // answers late must not replace the list for the name typed since.
  let latestRequest = 0

  async function load() {
    const request = ++latestRequest
    isLoading.value = true
    error.value = false

    const query = appliedQuery ? { q: appliedQuery } : {}
    const result = await coreApi.GET(ENDPOINT[scope], { params: { query } })
    if (request !== latestRequest) return

    if (result.error || !result.data) {
      error.value = true
      creators.value = []
    } else {
      creators.value = result.data
    }
    isLoading.value = false
  }

  function applyQuery(text: string) {
    const trimmed = text.trim()
    if (trimmed === appliedQuery) return
    appliedQuery = trimmed
    void load()
  }

  // A search waits for typing to pause; clearing the name restores the full
  // list at once, so reopening a picker never shows the previous search.
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(nameQuery, (text) => {
    clearTimeout(searchTimer)
    if (text.trim() === '') {
      applyQuery(text)
      return
    }
    searchTimer = setTimeout(() => applyQuery(text), SEARCH_DEBOUNCE_MS)
  })
  onScopeDispose(() => clearTimeout(searchTimer))

  void load()

  return { creators, nameQuery, isLoading, error, retry: load }
}
