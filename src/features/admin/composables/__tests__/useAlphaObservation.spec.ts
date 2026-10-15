import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const coreGET = vi.fn()
const eventGET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: coreGET }, eventApi: { GET: eventGET } }),
}))

import {
  useAlphaObservation,
  useAlphaStudentNames,
  useAlphaStudentObservation,
  useAlphaStudentSearch,
  useLoggedEvents,
} from '@/features/admin/composables/useAlphaObservation'
import type { StudentFilter } from '@/features/admin/utils/alphaObservation'

function ok(data: unknown) {
  return Promise.resolve({ data, response: new Response(null, { status: 200 }) })
}

function failed(status: number) {
  return Promise.resolve({ error: {}, response: new Response(null, { status }) })
}

beforeEach(() => {
  coreGET.mockReset()
  eventGET.mockReset()
})

describe('useAlphaObservation', () => {
  function page(ids: string[], total: number, offset = 0) {
    return ok({
      week: { week_start: '2026-10-12' },
      students: ids.map((student_id) => ({ student_id })),
      students_total: total,
      limit: 20,
      offset,
      filter_counts: { all: total, below_target: 0, quiet: 0 },
    })
  }

  function mount(week = ref<string | undefined>(undefined)) {
    const filter = ref<StudentFilter>('all')
    const search = ref('')
    return { week, filter, search, ...useAlphaObservation(week, filter, search) }
  }

  it('loads the first 20 students of the running week when no week is chosen', async () => {
    coreGET.mockReturnValue(page(['a', 'b'], 2))

    const { observation, students, isLoading } = mount()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(coreGET).toHaveBeenCalledWith('/admin/alpha-observation', { params: { query: { limit: 20, offset: 0 } } })
    expect(observation.value?.week.week_start).toBe('2026-10-12')
    expect(students.value.map((s) => s.student_id)).toEqual(['a', 'b'])
  })

  it('adds the next 20 below the ones shown, for the same week, filter and search', async () => {
    coreGET.mockReturnValueOnce(page(['a', 'b'], 3)).mockReturnValueOnce(page(['c'], 3, 2))
    const { students, hasMore, isLoading, loadMore } = mount(ref('2026-10-05'))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(hasMore.value).toBe(true)

    await loadMore()

    expect(coreGET).toHaveBeenLastCalledWith('/admin/alpha-observation', { params: { query: { week: '2026-10-05', limit: 20, offset: 2 } } })
    expect(students.value.map((s) => s.student_id)).toEqual(['a', 'b', 'c'])
    expect(hasMore.value).toBe(false)
  })

  it('shows a student once when one who practised between two pages moved into the next', async () => {
    // a finished a session after the first page, so the order moved them after c.
    coreGET.mockReturnValueOnce(page(['a', 'b'], 4)).mockReturnValueOnce(page(['c', 'a'], 4, 2))
    const { students, isLoading, loadMore } = mount()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    await loadMore()

    expect(students.value.map((s) => s.student_id)).toEqual(['a', 'b', 'c'])
  })

  it('asks the server for the filter and starts again from the first page', async () => {
    coreGET.mockReturnValue(page(['a'], 1))
    const { filter, isLoading } = mount()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    filter.value = 'belowTarget'
    await vi.waitFor(() =>
      expect(coreGET).toHaveBeenLastCalledWith('/admin/alpha-observation', { params: { query: { filter: 'below_target', limit: 20, offset: 0 } } }),
    )
  })

  it('searches by name once typing pauses', async () => {
    vi.useFakeTimers()
    coreGET.mockReturnValue(page(['a'], 1))
    const { search } = mount()
    await vi.runAllTimersAsync()

    search.value = 'roc'
    search.value = 'rocha'
    await vi.advanceTimersByTimeAsync(299)
    expect(coreGET).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)

    expect(coreGET).toHaveBeenCalledTimes(2)
    expect(coreGET).toHaveBeenLastCalledWith('/admin/alpha-observation', { params: { query: { q: 'rocha', limit: 20, offset: 0 } } })
    vi.useRealTimers()
  })

  it('loads again for the week chosen next', async () => {
    coreGET.mockReturnValue(page(['a'], 1))
    const { week, isLoading } = mount()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    week.value = '2026-10-05'
    await vi.waitFor(() =>
      expect(coreGET).toHaveBeenLastCalledWith('/admin/alpha-observation', { params: { query: { week: '2026-10-05', limit: 20, offset: 0 } } }),
    )
  })

  it('keeps the newest request when an older answer arrives late', async () => {
    let answerFirst: (value: unknown) => void = () => {}
    coreGET
      .mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
      .mockReturnValueOnce(page(['newer'], 1))
    const { week, students, isLoading } = mount()

    week.value = '2026-10-05'
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    answerFirst({ data: { week: {}, students: [{ student_id: 'older' }], students_total: 1, limit: 20, offset: 0, filter_counts: {} } })
    await Promise.resolve()

    expect(students.value.map((s) => s.student_id)).toEqual(['newer'])
  })

  it('reports a failure, and loads again on retry', async () => {
    coreGET.mockReturnValueOnce(failed(500)).mockReturnValueOnce(page(['a'], 1))

    const { error, isLoading, retry } = mount()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(error.value).toBe(true)

    retry()
    await vi.waitFor(() => expect(error.value).toBe(false))
  })
})

describe('useAlphaStudentSearch', () => {
  it('lists the first students of the alpha until something is typed', async () => {
    coreGET.mockReturnValue(ok({ items: [{ user_id: 'a', display_name: 'Ana' }], total: 1, limit: 20, offset: 0 }))

    const { students, isLoading } = useAlphaStudentSearch()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(coreGET).toHaveBeenCalledWith('/admin/alpha-observation/students', { params: { query: { limit: 20 } } })
    expect(students.value).toEqual([{ user_id: 'a', display_name: 'Ana' }])
  })

  it('searches by name once typing pauses', async () => {
    vi.useFakeTimers()
    coreGET.mockReturnValue(ok({ items: [], total: 0, limit: 20, offset: 0 }))
    const { nameQuery } = useAlphaStudentSearch()
    await vi.runAllTimersAsync()

    nameQuery.value = 'cami'
    await vi.advanceTimersByTimeAsync(300)

    expect(coreGET).toHaveBeenLastCalledWith('/admin/alpha-observation/students', { params: { query: { q: 'cami', limit: 20 } } })
    vi.useRealTimers()
  })
})

describe('useAlphaStudentNames', () => {
  it('names the students asked for, once each', async () => {
    coreGET.mockReturnValue(ok({ items: [{ user_id: 'a', display_name: 'Ana' }, { user_id: 'b', display_name: 'Bia' }], total: 2, limit: 100, offset: 0 }))
    const ids = ref(['a', 'b', 'a'])

    const { names } = useAlphaStudentNames(ids)
    await vi.waitFor(() => expect(names.value).toEqual({ a: 'Ana', b: 'Bia' }))

    expect(coreGET).toHaveBeenCalledWith('/admin/alpha-observation/students', { params: { query: { student_id: ['a', 'b'], limit: 100 } } })
  })

  it('asks only for the students it has not named yet', async () => {
    coreGET
      .mockReturnValueOnce(ok({ items: [{ user_id: 'a', display_name: 'Ana' }], total: 1, limit: 100, offset: 0 }))
      .mockReturnValueOnce(ok({ items: [{ user_id: 'c', display_name: 'Caio' }], total: 1, limit: 100, offset: 0 }))
    const ids = ref(['a'])
    const { names } = useAlphaStudentNames(ids)
    await vi.waitFor(() => expect(names.value).toEqual({ a: 'Ana' }))

    ids.value = ['a', 'c']
    await vi.waitFor(() => expect(names.value).toEqual({ a: 'Ana', c: 'Caio' }))

    expect(coreGET).toHaveBeenLastCalledWith('/admin/alpha-observation/students', { params: { query: { student_id: ['c'], limit: 100 } } })
  })

  it('asks no one when there is nobody to name', () => {
    useAlphaStudentNames(ref([]))

    expect(coreGET).not.toHaveBeenCalled()
  })

  it('reports a failure, and asks again on retry', async () => {
    coreGET.mockReturnValueOnce(failed(500)).mockReturnValueOnce(ok({ items: [{ user_id: 'a', display_name: 'Ana' }], total: 1, limit: 100, offset: 0 }))
    const { names, error, retry } = useAlphaStudentNames(ref(['a']))
    await vi.waitFor(() => expect(error.value).toBe(true))

    retry()
    await vi.waitFor(() => expect(names.value).toEqual({ a: 'Ana' }))
    expect(error.value).toBe(false)
  })
})

describe('useAlphaStudentObservation', () => {
  it('loads one student for the week chosen', async () => {
    coreGET.mockReturnValue(ok({ student: { student_id: 's-1' } }))

    const { observation, isLoading } = useAlphaStudentObservation('s-1', ref('2026-10-12'))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(coreGET).toHaveBeenCalledWith('/admin/alpha-observation/students/{student_id}', {
      params: { path: { student_id: 's-1' }, query: { week: '2026-10-12' } },
    })
    expect(observation.value).toEqual({ student: { student_id: 's-1' } })
  })
})

describe('useLoggedEvents', () => {
  function page(count: number, total: number, from = 0) {
    const items = Array.from({ length: count }, (_, i) => ({ received_at: `t-${from + i}`, event: { event_id: `e-${from + i}` } }))
    return ok({ items, total, limit: 12, offset: from })
  }

  it('loads the newest 12 events of every student and type', async () => {
    eventGET.mockReturnValue(page(12, 46))

    const { events, total, hasMore, isLoading } = useLoggedEvents(ref(null), ref(null))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(eventGET).toHaveBeenCalledWith('/admin/events', { params: { query: { limit: 12, offset: 0 } } })
    expect(events.value).toHaveLength(12)
    expect(total.value).toBe(46)
    expect(hasMore.value).toBe(true)
  })

  it('narrows to a student and a type group, starting again from the newest', async () => {
    eventGET.mockReturnValue(page(3, 3))
    const student = ref<string | null>(null)
    const group = ref<'practice_sessions' | null>(null)
    const { isLoading } = useLoggedEvents(student, group)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    student.value = 's-1'
    group.value = 'practice_sessions'
    await vi.waitFor(() =>
      expect(eventGET).toHaveBeenLastCalledWith('/admin/events', {
        params: { query: { student_id: 's-1', type_group: 'practice_sessions', limit: 12, offset: 0 } },
      }),
    )
  })

  it('adds the next 12 below the ones shown', async () => {
    eventGET.mockReturnValueOnce(page(12, 20)).mockReturnValueOnce(page(8, 20, 12))
    const { events, isLoading, loadMore } = useLoggedEvents(ref(null), ref(null))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    await loadMore()

    expect(eventGET).toHaveBeenLastCalledWith('/admin/events', { params: { query: { limit: 12, offset: 12 } } })
    expect(events.value).toHaveLength(20)
  })

  it('shows an event once when newer events shifted the next page', async () => {
    const event = (n: number) => ({ received_at: `t-${n}`, event: { event_id: `e-${n}` } })
    eventGET
      .mockReturnValueOnce(ok({ items: Array.from({ length: 12 }, (_, i) => event(100 - i)), total: 40, limit: 12, offset: 0 }))
      .mockReturnValueOnce(ok({ items: Array.from({ length: 12 }, (_, i) => event(89 - i)), total: 41, limit: 12, offset: 12 }))
    const { events, isLoading, loadMore } = useLoggedEvents(ref(null), ref(null))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    await loadMore()

    const ids = events.value.map((e) => e.event.event_id)
    expect(ids).toHaveLength(23)
    expect(new Set(ids).size).toBe(23)
  })
})
