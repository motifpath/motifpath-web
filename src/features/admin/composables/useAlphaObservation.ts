import { computed, ref, shallowRef, watch, type Ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { components as eventComponents } from '@/api/generated/event-ingestion'
import type { EventTypeGroup } from '@/features/admin/utils/alphaObservation'
import { useApi } from '@/shared/composables/useApi'
import { useApiPagedList } from '@/shared/composables/useApiPagedList'

type AlphaObservation = components['schemas']['AlphaObservation']
type AlphaStudentObservation = components['schemas']['AlphaStudentObservation']
type LoggedEvent = eventComponents['schemas']['LoggedEvent']

/** The event log is read 12 events at a time. */
export const EVENT_PAGE_SIZE = 12

/** The alpha measured for the chosen week; the running week while none is chosen. */
export function useAlphaObservation(week: Ref<string | undefined>) {
  const { coreApi } = useApi()
  const { item: observation, ...state } = useWeekItem<AlphaObservation>(week, () =>
    coreApi.GET('/admin/alpha-observation', { params: { query: weekQuery(week.value) } }),
  )
  return { observation, ...state }
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
