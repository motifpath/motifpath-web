import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const coreGET = vi.fn()
const eventGET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: coreGET }, eventApi: { GET: eventGET } }),
}))

import { useAlphaObservation, useAlphaStudentObservation, useLoggedEvents } from '@/features/admin/composables/useAlphaObservation'

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
  it('loads the running week when no week is chosen', async () => {
    coreGET.mockReturnValue(ok({ week: { week_start: '2026-10-12' } }))

    const { observation, isLoading } = useAlphaObservation(ref(undefined))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(coreGET).toHaveBeenCalledWith('/admin/alpha-observation', { params: { query: {} } })
    expect(observation.value).toEqual({ week: { week_start: '2026-10-12' } })
  })

  it('loads again for the week chosen next', async () => {
    coreGET.mockReturnValue(ok({ week: { week_start: '2026-10-12' } }))
    const week = ref<string | undefined>(undefined)
    const { isLoading } = useAlphaObservation(week)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    week.value = '2026-10-05'
    await vi.waitFor(() => expect(coreGET).toHaveBeenCalledTimes(2))

    expect(coreGET).toHaveBeenLastCalledWith('/admin/alpha-observation', { params: { query: { week: '2026-10-05' } } })
  })

  it('keeps the newest week when an older answer arrives late', async () => {
    let answerFirst: (value: unknown) => void = () => {}
    coreGET
      .mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
      .mockReturnValueOnce(ok({ week: { week_start: '2026-10-05' } }))
    const week = ref<string | undefined>(undefined)
    const { observation, isLoading } = useAlphaObservation(week)

    week.value = '2026-10-05'
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    answerFirst({ data: { week: { week_start: '2026-10-12' } }, response: new Response(null, { status: 200 }) })
    await Promise.resolve()

    expect(observation.value).toEqual({ week: { week_start: '2026-10-05' } })
  })

  it('reports a failure, and loads again on retry', async () => {
    coreGET.mockReturnValueOnce(failed(500)).mockReturnValueOnce(ok({ week: {} }))

    const { error, isLoading, retry } = useAlphaObservation(ref(undefined))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(error.value).toBe(true)

    retry()
    await vi.waitFor(() => expect(error.value).toBe(false))
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
