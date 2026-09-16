import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useExercise } from '@/features/teacher/composables/useExercise'

describe('useExercise', () => {
  it('loads the exercise by id on creation', async () => {
    const exercise = { exercise_id: 'e-1', title: 't' }
    GET.mockResolvedValueOnce({ data: exercise, error: undefined, response: { status: 200 } })

    const { exercise: result, isLoading, error } = useExercise('e-1')
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/exercises/{exercise_id}', { params: { path: { exercise_id: 'e-1' } } })
    expect(result.value).toEqual(exercise)
    expect(error.value).toBe(false)
  })

  it('sets error and a null exercise when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 404 } })

    const { exercise, isLoading, error } = useExercise('missing')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(exercise.value).toBeNull()
    expect(error.value).toBe(true)
  })
})
