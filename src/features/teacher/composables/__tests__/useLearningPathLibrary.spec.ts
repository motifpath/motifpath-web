import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useLearningPathLibrary } from '@/features/teacher/composables/useLearningPathLibrary'

function ok(items: unknown[], total = items.length) {
  return { data: { items, total, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } }
}

function lastQuery() {
  return GET.mock.lastCall?.[1]?.params?.query
}

async function settle(isLoading: { value: boolean }) {
  await nextTick()
  await vi.waitFor(() => expect(isLoading.value).toBe(false))
}

describe('useLearningPathLibrary', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue(ok([]))
  })
  afterEach(() => vi.useRealTimers())

  it('loads the first page of the library, sorted by title', async () => {
    const paths = [{ learning_path_id: 'lp-1', title: 'Open chords' }]
    GET.mockResolvedValueOnce(ok(paths, 1))

    const { paths: result, total, isLoading } = useLearningPathLibrary()
    await settle(isLoading)

    expect(GET).toHaveBeenCalledWith('/learning-paths', { params: { query: { limit: 20, offset: 0, sort: 'title' } } })
    expect(result.value).toEqual(paths)
    expect(total.value).toBe(1)
  })

  it('sorts by last update', async () => {
    const { sort, isLoading } = useLearningPathLibrary()
    await settle(isLoading)

    sort.value = 'updated'
    await settle(isLoading)

    expect(lastQuery()).toEqual({ limit: 20, offset: 0, sort: 'updated' })
  })

  it('sends the level, skill, concept, instrument and author filters', async () => {
    const { filters, isLoading } = useLearningPathLibrary()
    await settle(isLoading)

    filters.levels = ['beginner', 'advanced']
    filters.skillIds = ['s-1']
    filters.conceptIds = ['c-1']
    filters.instrumentId = 'i-guitar'
    filters.teacher = { user_id: 'u-1', display_name: 'Me' }
    await settle(isLoading)

    expect(lastQuery()).toEqual({
      limit: 20,
      offset: 0,
      sort: 'title',
      levels: ['beginner', 'advanced'],
      skill_ids: ['s-1'],
      concept_ids: ['c-1'],
      instrument_id: 'i-guitar',
      created_by: 'u-1',
    })
  })

  it('searches by title once typing pauses', async () => {
    vi.useFakeTimers()
    const { searchText, isLoading } = useLearningPathLibrary()
    await vi.runAllTimersAsync()

    searchText.value = ' open '
    await vi.advanceTimersByTimeAsync(300)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(lastQuery()).toEqual({ limit: 20, offset: 0, sort: 'title', q: 'open' })
  })

  it('keeps the sort when the filters are cleared', async () => {
    const { filters, sort, clearFilters, hasActiveFilters, isLoading } = useLearningPathLibrary()
    await settle(isLoading)
    sort.value = 'updated'
    filters.instrumentId = 'i-guitar'
    await settle(isLoading)
    expect(hasActiveFilters.value).toBe(true)

    clearFilters()
    await settle(isLoading)

    expect(hasActiveFilters.value).toBe(false)
    expect(lastQuery()).toEqual({ limit: 20, offset: 0, sort: 'updated' })
  })
})
