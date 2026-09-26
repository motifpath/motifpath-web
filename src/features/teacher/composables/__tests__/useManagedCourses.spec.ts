import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useManagedCourses } from '@/features/teacher/composables/useManagedCourses'

function ok(items: unknown[], total = items.length) {
  return {
    data: { items, total, limit: 20, offset: 0 },
    error: undefined,
    response: { status: 200 },
  }
}

function lastQuery() {
  return GET.mock.lastCall?.[1]?.params?.query
}

describe('useManagedCourses', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue(ok([]))
  })
  afterEach(() => vi.useRealTimers())

  it('loads the first page of the authoring course list, every status', async () => {
    const courses = [{ course_id: 'c-1', title: 'Fingerstyle journey', status: 'draft' }]
    GET.mockResolvedValueOnce(ok(courses, 1))

    const { courses: result, total, isLoading } = useManagedCourses()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/courses', { params: { query: { limit: 20, offset: 0 } } })
    expect(result.value).toEqual(courses)
    expect(total.value).toBe(1)
  })

  it('narrows to one status, and back to every status', async () => {
    const { status, isLoading } = useManagedCourses()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    status.value = 'draft'
    await nextTick()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(lastQuery()).toEqual({ limit: 20, offset: 0, status: 'draft' })

    status.value = null
    await nextTick()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(lastQuery()).toEqual({ limit: 20, offset: 0 })
  })

  it('sends the level, skill, concept and teacher filters', async () => {
    const { filters, isLoading } = useManagedCourses()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    filters.levels = ['advanced']
    filters.skillIds = ['s-1']
    filters.conceptIds = ['k-1']
    filters.teacher = { user_id: 'u-1', display_name: 'Tomás Ribeiro' }
    await nextTick()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(lastQuery()).toEqual({
      limit: 20,
      offset: 0,
      levels: ['advanced'],
      skill_ids: ['s-1'],
      concept_ids: ['k-1'],
      created_by: 'u-1',
    })
  })

  it('sends the language and instrument filters', async () => {
    const { filters, isLoading } = useManagedCourses()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    filters.language = 'pt_BR'
    filters.instrumentId = 'i-guitar'
    await nextTick()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(lastQuery()).toEqual({ limit: 20, offset: 0, language: 'pt_BR', instrument_id: 'i-guitar' })
  })

  it('waits for typing to pause before searching by text', async () => {
    vi.useFakeTimers()
    const { searchText } = useManagedCourses()
    await vi.runAllTimersAsync()
    GET.mockClear()

    searchText.value = 'rhy'
    await nextTick()
    searchText.value = 'rhythm'
    await vi.runAllTimersAsync()

    expect(GET).toHaveBeenCalledTimes(1)
    expect(lastQuery()).toEqual({ limit: 20, offset: 0, q: 'rhythm' })
  })

  it('does not count the status tab as a filter to clear', async () => {
    const { status, filters, hasActiveFilters, clearFilters, isLoading } = useManagedCourses()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    status.value = 'published'
    await nextTick()
    expect(hasActiveFilters.value).toBe(false)

    filters.levels = ['beginner']
    await nextTick()
    expect(hasActiveFilters.value).toBe(true)

    clearFilters()
    await nextTick()
    expect(hasActiveFilters.value).toBe(false)
    expect(status.value).toBe('published')
  })
})
