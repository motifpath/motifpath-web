import { ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import {
  coursesQuery,
  diagramsQuery,
  exercisesQuery,
  lessonsQuery,
  pathsQuery,
} from '@/features/teacher/utils/authoringApiQuery'
import {
  emptyListState,
  type AuthoringListState,
  type AuthoringSection,
} from '@/features/teacher/utils/authoringListQuery'
import { useApi } from '@/shared/composables/useApi'
import { type PageRequest, useApiPagedList } from '@/shared/composables/useApiPagedList'

type Schemas = components['schemas']
type CoreApi = ReturnType<typeof useApi>['coreApi']

/** What each section lists. */
export interface AuthoringSectionItems {
  diagrams: Schemas['PagedDiagrams']['items'][number]
  exercises: Schemas['PagedExercises']['items'][number]
  lessons: Schemas['PagedContentNodes']['items'][number]
  paths: Schemas['PagedLearningPaths']['items'][number]
  courses: Schemas['PagedCourseCatalog']['items'][number]
}

type Fetchers = {
  [S in AuthoringSection]: (
    coreApi: CoreApi,
    state: AuthoringListState,
    page: PageRequest,
  ) => Promise<{ data?: { items: AuthoringSectionItems[S][]; total: number }; error?: unknown }>
}

const FETCHERS: Fetchers = {
  diagrams: (coreApi, state, page) =>
    coreApi.GET('/diagrams', { params: { query: { ...diagramsQuery(state), ...page } } }),
  exercises: (coreApi, state, page) =>
    coreApi.GET('/exercises', { params: { query: { ...exercisesQuery(state), ...page } } }),
  lessons: (coreApi, state, page) =>
    coreApi.GET('/content-nodes', { params: { query: { ...lessonsQuery(state), ...page } } }),
  paths: (coreApi, state, page) =>
    coreApi.GET('/learning-paths', { params: { query: { ...pathsQuery(state), ...page } } }),
  courses: (coreApi, state, page) =>
    coreApi.GET('/courses', { params: { query: { ...coursesQuery(state), ...page } } }),
}

const COUNT_ONLY: PageRequest = { limit: 1, offset: 0 }

/**
 * One Teach section's items for a list state, 20 at a time, starting over whenever what it
 * asks the server changes. It also knows the section's total with nothing chosen, and can count
 * what another choice would show without loading it (for a filters layer's live total).
 */
export function useAuthoringList<S extends AuthoringSection>(section: S, state: AuthoringListState) {
  const { coreApi } = useApi()
  const fetch: Fetchers[S] = FETCHERS[section]

  const { reload, ...list } = useApiPagedList<AuthoringSectionItems[S]>((api, page) => fetch(api, state, page))

  // Only what reaches the server starts the list over, so a choice the endpoint ignores doesn't.
  watch(
    () => JSON.stringify(fetchKey(state)),
    () => void reload(),
  )

  function fetchKey(current: AuthoringListState) {
    return { q: current.q.trim(), sort: current.sort, status: current.status, filters: current.filters }
  }

  const sectionTotal = ref<number | null>(null)
  void countFor(emptyListState()).then((total) => (sectionTotal.value = total))

  async function countFor(choice: AuthoringListState): Promise<number | null> {
    const result = await fetch(coreApi, choice, COUNT_ONLY)
    return result.error || !result.data ? null : result.data.total
  }

  return { ...list, reload, sectionTotal, countFor }
}
