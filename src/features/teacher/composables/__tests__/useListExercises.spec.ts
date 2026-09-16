import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListExercises } from '@/features/teacher/composables/useListExercises'

describe('useListExercises', () => {
  it('loads exercises on creation', async () => {
    const exercises = [{ exercise_id: 'e-1' }, { exercise_id: 'e-2' }]
    GET.mockResolvedValueOnce({ data: exercises, error: undefined, response: { status: 200 } })

    const { exercises: result, isLoading, error } = useListExercises()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/exercises', {})
    expect(result.value).toEqual(exercises)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { exercises, isLoading, error } = useListExercises()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(exercises.value).toEqual([])
    expect(error.value).toBe(true)
  })

  it('retry re-fetches the list', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const { exercises, isLoading, error, retry } = useListExercises()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(error.value).toBe(true)

    GET.mockResolvedValueOnce({ data: [{ exercise_id: 'e-1' }], error: undefined, response: { status: 200 } })
    await retry()

    expect(error.value).toBe(false)
    expect(exercises.value).toEqual([{ exercise_id: 'e-1' }])
  })
})
