import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useCourseCatalog } from '@/features/student/composables/useCourseCatalog'

function ok(items: unknown[], total = items.length) {
  return { data: { items, total, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } }
}

function lastQuery() {
  return GET.mock.lastCall?.[1]?.params?.query
}

describe('useCourseCatalog', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue(ok([]))
  })
  afterEach(() => vi.useRealTimers())

  it('loads the first page of the catalog with no filters', async () => {
    const courses = [{ course_id: 'c-1', title: 'Fingerstyle journey' }]
    GET.mockResolvedValueOnce(ok(courses, 1))

    const { courses: result, total, isLoading } = useCourseCatalog()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/courses', { params: { query: { limit: 20, offset: 0, status: 'published' } } })
    expect(result.value).toEqual(courses)
    expect(total.value).toBe(1)
  })

  it('reloads with levels, skills, concepts and teacher once they are set', async () => {
    const { filters, isLoading } = useCourseCatalog()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    filters.levels = ['beginner', 'intermediate']
    filters.skillIds = ['s-1']
    filters.conceptIds = ['c-1']
    filters.teacher = { user_id: 'u-1', display_name: 'Bob Martins' }
    await nextTick()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(lastQuery()).toEqual({
      limit: 20,
      offset: 0,
      status: 'published',
      levels: ['beginner', 'intermediate'],
      skill_ids: ['s-1'],
      concept_ids: ['c-1'],
      created_by: 'u-1',
    })
  })

  it('omits filters that are cleared again', async () => {
    const { filters, isLoading } = useCourseCatalog()
    filters.levels = ['beginner']
    await nextTick()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    filters.levels = []
    await nextTick()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(lastQuery()).toEqual({ limit: 20, offset: 0, status: 'published' })
  })

  it('waits for typing to pause before searching by text', async () => {
    vi.useFakeTimers()
    const { searchText } = useCourseCatalog()
    await vi.runAllTimersAsync()
    GET.mockClear()

    searchText.value = 'fin'
    await nextTick()
    searchText.value = 'finger'
    await nextTick()
    await vi.advanceTimersByTimeAsync(299)
    expect(GET).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(GET).toHaveBeenCalledTimes(1)
    expect(lastQuery()).toEqual({ limit: 20, offset: 0, status: 'published', q: 'finger' })
  })

  it('does not send a blank search', async () => {
    vi.useFakeTimers()
    const { searchText } = useCourseCatalog()
    await vi.runAllTimersAsync()

    searchText.value = '   '
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)

    expect(lastQuery()).toEqual({ limit: 20, offset: 0, status: 'published' })
  })

  it('reports whether any filter is active and clears them all at once', async () => {
    vi.useFakeTimers()
    const { filters, searchText, hasActiveFilters, clearFilters } = useCourseCatalog()
    await vi.runAllTimersAsync()
    expect(hasActiveFilters.value).toBe(false)

    filters.levels = ['expert']
    searchText.value = 'jazz'
    await vi.advanceTimersByTimeAsync(300)
    expect(hasActiveFilters.value).toBe(true)

    clearFilters()
    await vi.advanceTimersByTimeAsync(300)
    expect(hasActiveFilters.value).toBe(false)
    expect(searchText.value).toBe('')
    expect(lastQuery()).toEqual({ limit: 20, offset: 0, status: 'published' })
  })
})
