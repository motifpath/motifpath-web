import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useExerciseLibrary } from '@/features/teacher/composables/useExerciseLibrary'

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

describe('useExerciseLibrary', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue(ok([]))
  })
  afterEach(() => vi.useRealTimers())

  it('loads the first page of the pool unfiltered', async () => {
    const exercises = [{ exercise_id: 'x-1', title: 'Triads' }]
    GET.mockResolvedValueOnce(ok(exercises, 30))

    const { exercises: result, total, hasActiveFilters, isLoading } = useExerciseLibrary()
    await settle(isLoading)

    expect(GET).toHaveBeenCalledWith('/exercises', { params: { query: { limit: 20, offset: 0 } } })
    expect(result.value).toEqual(exercises)
    expect(total.value).toBe(30)
    expect(hasActiveFilters.value).toBe(false)
  })

  it('sends the type, skill, concept, language and creator filters, starting over from the first page', async () => {
    const { filters, exerciseType, hasActiveFilters, isLoading } = useExerciseLibrary()
    await settle(isLoading)

    exerciseType.value = 'text_response'
    filters.skillIds = ['s-1']
    filters.conceptIds = ['c-1']
    filters.language = 'pt_BR'
    filters.teacher = { user_id: 'u-1', display_name: 'Bob' }
    await settle(isLoading)

    expect(lastQuery()).toEqual({
      limit: 20,
      offset: 0,
      exercise_type: 'text_response',
      skill_id: 's-1',
      concept_id: 'c-1',
      language: 'pt_BR',
      created_by: 'u-1',
    })
    expect(hasActiveFilters.value).toBe(true)
  })

  it('counts the type alone as an active filter', async () => {
    const { exerciseType, hasActiveFilters, isLoading } = useExerciseLibrary()
    await settle(isLoading)

    exerciseType.value = 'image_choice'

    expect(hasActiveFilters.value).toBe(true)
  })

  it('searches by title once typing pauses', async () => {
    vi.useFakeTimers()
    const { searchText, isLoading } = useExerciseLibrary()
    await vi.runAllTimersAsync()

    searchText.value = ' triad '
    await vi.advanceTimersByTimeAsync(300)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(lastQuery()).toEqual({ limit: 20, offset: 0, q: 'triad' })
  })

  it('clears every filter, the type included', async () => {
    const { filters, exerciseType, clearFilters, hasActiveFilters, isLoading } = useExerciseLibrary()
    await settle(isLoading)
    exerciseType.value = 'text_response'
    filters.language = 'en'
    await settle(isLoading)

    clearFilters()
    await settle(isLoading)

    expect(lastQuery()).toEqual({ limit: 20, offset: 0 })
    expect(exerciseType.value).toBeNull()
    expect(hasActiveFilters.value).toBe(false)
  })
})
