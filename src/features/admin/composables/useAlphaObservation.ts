import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { components as eventComponents } from '@/api/generated/event-ingestion'
import type { EventTypeGroup, StudentFilter } from '@/features/admin/utils/alphaObservation'
import { useApi } from '@/shared/composables/useApi'
import { useApiPagedList } from '@/shared/composables/useApiPagedList'

type AlphaObservation = components['schemas']['AlphaObservation']
type AlphaStudent = components['schemas']['AlphaStudent']
type UserRef = components['schemas']['UserRef']
type AlphaStudentObservation = components['schemas']['AlphaStudentObservation']
type LoggedEvent = eventComponents['schemas']['LoggedEvent']

/** The event log is read 12 events at a time. */
export const EVENT_PAGE_SIZE = 12

/** The overview lists the alpha 20 students at a time. */
export const STUDENT_PAGE_SIZE = 20

/** A name search waits for typing to pause this long. */
const SEARCH_DEBOUNCE_MS = 300

const KEEP: Record<StudentFilter, 'below_target' | 'quiet' | undefined> = {
  all: undefined,
  belowTarget: 'below_target',
  quiet: 'quiet',
}

/**
 * The alpha measured for the chosen week (the running week while none is chosen), and the students
 * the filter and the name search keep, 20 at a time. The week's summary and every filter's count
 * describe the whole alpha. Changing the week, the filter or the search starts again from the
 * first page; an answer that arrives after a newer request is dropped.
 */
export function useAlphaObservation(week: Ref<string | undefined>, filter: Ref<StudentFilter>, search: Ref<string>) {
  const { coreApi } = useApi()
  const observation = shallowRef<AlphaObservation | null>(null)
  const students = shallowRef<AlphaStudent[]>([])
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const error = ref(false)
  const loadMoreError = ref(false)
  const appliedSearch = ref(search.value.trim())
  const hasMore = computed(() => observation.value !== null && students.value.length < observation.value.students_total)
  let generation = 0

  function fetchPage(offset: number) {
    const keep = KEEP[filter.value]
    return coreApi.GET('/admin/alpha-observation', {
      params: {
        query: {
          ...weekQuery(week.value),
          ...(appliedSearch.value ? { q: appliedSearch.value } : {}),
          ...(keep ? { filter: keep } : {}),
          limit: STUDENT_PAGE_SIZE,
          offset,
        },
      },
    })
  }

  async function load() {
    const current = ++generation
    isLoading.value = true
    isLoadingMore.value = false
    error.value = false
    loadMoreError.value = false

    const result = await fetchPage(0)
    if (current !== generation) return

    const failed = Boolean(result.error) || !result.data
    observation.value = failed ? null : (result.data ?? null)
    students.value = failed || !result.data ? [] : result.data.students
    error.value = failed
    isLoading.value = false
  }

  async function loadMore() {
    if (isLoading.value || isLoadingMore.value || !hasMore.value) return
    const current = generation
    isLoadingMore.value = true
    loadMoreError.value = false

    const result = await fetchPage(students.value.length)
    if (current !== generation) return

    if (result.error || !result.data) {
      loadMoreError.value = true
    } else {
      observation.value = result.data
      students.value = [...students.value, ...result.data.students]
    }
    isLoadingMore.value = false
  }

  // Clearing the search shows everyone at once; typing waits for a pause.
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(search, (text) => {
    clearTimeout(searchTimer)
    if (text.trim() === '') {
      appliedSearch.value = ''
      return
    }
    searchTimer = setTimeout(() => (appliedSearch.value = text.trim()), SEARCH_DEBOUNCE_MS)
  })
  onScopeDispose(() => clearTimeout(searchTimer))

  watch([week, filter, appliedSearch], () => void load())
  void load()

  return { observation, students, hasMore, isLoading, isLoadingMore, error, loadMoreError, retry: () => void load(), loadMore }
}

/** The first students of the alpha whose name holds what is typed, for picking one. */
export function useAlphaStudentSearch() {
  const { coreApi } = useApi()
  const students = ref<UserRef[]>([])
  const nameQuery = ref('')
  const isLoading = ref(false)
  const error = ref(false)
  let appliedQuery = ''
  let latestRequest = 0

  async function load() {
    const request = ++latestRequest
    isLoading.value = true
    error.value = false
    const result = await coreApi.GET('/admin/alpha-observation/students', {
      params: { query: { ...(appliedQuery ? { q: appliedQuery } : {}), limit: STUDENT_PAGE_SIZE } },
    })
    if (request !== latestRequest) return

    error.value = Boolean(result.error) || !result.data
    students.value = result.data?.items ?? []
    isLoading.value = false
  }

  function applyQuery(text: string) {
    const trimmed = text.trim()
    if (trimmed === appliedQuery) return
    appliedQuery = trimmed
    void load()
  }

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

  return { students, nameQuery, isLoading, error, retry: () => void load() }
}

/** The most students named in one lookup. */
const NAMES_PER_LOOKUP = 100

/**
 * The display names of the students in ids, looked up as new ids appear and kept once known. An id
 * outside the alpha never gets a name, and is not asked about again.
 */
export function useAlphaStudentNames(ids: Ref<string[]>) {
  const { coreApi } = useApi()
  const names = ref<Record<string, string>>({})
  const error = ref(false)
  const asked = new Set<string>()

  async function lookUp(batch: string[]) {
    const result = await coreApi.GET('/admin/alpha-observation/students', {
      params: { query: { student_id: batch, limit: NAMES_PER_LOOKUP } },
    })
    if (result.error || !result.data) {
      batch.forEach((id) => asked.delete(id))
      error.value = true
      return
    }
    names.value = { ...names.value, ...Object.fromEntries(result.data.items.map((s) => [s.user_id, s.display_name])) }
  }

  function nameNew() {
    const missing = [...new Set(ids.value)].filter((id) => !asked.has(id))
    missing.forEach((id) => asked.add(id))
    for (let start = 0; start < missing.length; start += NAMES_PER_LOOKUP) {
      void lookUp(missing.slice(start, start + NAMES_PER_LOOKUP))
    }
  }

  function retry() {
    error.value = false
    nameNew()
  }

  watch(ids, nameNew, { immediate: true })

  return { names, error, retry }
}

/** One student of the alpha, measured for the chosen week, with the sessions and nodes behind it. */
export function useAlphaStudentObservation(studentId: string, week: Ref<string | undefined>) {
  const { coreApi } = useApi()
  const { item: observation, ...state } = useWeekItem<AlphaStudentObservation>(week, () =>
    coreApi.GET('/admin/alpha-observation/students/{student_id}', {
      params: { path: { student_id: studentId }, query: weekQuery(week.value) },
    }),
  )
  return { observation, ...state }
}

/** The raw event log, newest first, narrowed to one student and one type group when they are set. */
export function useLoggedEvents(studentId: Ref<string | null>, typeGroup: Ref<EventTypeGroup | null>) {
  const { eventApi } = useApi()
  // The event log lives in the event ingestion service, so the core client the list hands over is unused.
  const list = useApiPagedList<LoggedEvent>(
    (_coreApi, page) =>
      eventApi.GET('/admin/events', {
        params: {
          query: {
            ...(studentId.value ? { student_id: studentId.value } : {}),
            ...(typeGroup.value ? { type_group: typeGroup.value } : {}),
            ...page,
          },
        },
      }),
    { pageSize: EVENT_PAGE_SIZE },
  )
  watch([studentId, typeGroup], () => void list.reload())

  // Paging is by offset over a log that keeps growing at the top, so each event that arrives
  // between two loads pushes one already-shown event into the next page.
  const events = computed(() => uniqueEvents(list.items.value))

  return { ...list, events }
}

function uniqueEvents(logged: LoggedEvent[]): LoggedEvent[] {
  const seen = new Set<string>()
  return logged.filter((entry) => {
    if (seen.has(entry.event.event_id)) return false
    seen.add(entry.event.event_id)
    return true
  })
}

function weekQuery(week: string | undefined): { week?: string } {
  return week ? { week } : {}
}

/**
 * Loads an item now and again whenever the week changes. An answer that arrives after a newer
 * load has started is dropped, so stepping quickly through weeks never leaves an older week shown.
 */
function useWeekItem<TItem>(
  week: Ref<string | undefined>,
  perform: () => Promise<{ data?: TItem; error?: unknown }>,
) {
  const item = shallowRef<TItem | null>(null)
  const isLoading = ref(false)
  const error = ref(false)
  let generation = 0

  async function load() {
    const current = ++generation
    isLoading.value = true
    error.value = false

    const result = await perform()
    if (current !== generation) return

    const failed = Boolean(result.error) || !result.data
    item.value = failed ? null : (result.data ?? null)
    error.value = failed
    isLoading.value = false
  }

  watch(week, () => void load())
  void load()

  return { item, isLoading, error, retry: () => void load() }
}
