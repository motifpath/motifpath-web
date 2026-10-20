import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useListChallengeExercises } from '@/features/teacher/composables/useListChallengeExercises'

describe('useListChallengeExercises', () => {
  it('loads the challenge exercises on creation', async () => {
    const exercises = [{ exercise_id: 'e-1' }]
    GET.mockResolvedValueOnce({ data: exercises, error: undefined, response: { status: 200 } })

    const { exercises: result, isLoading, error } = useListChallengeExercises('ch-1')
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/challenges/{challenge_id}/exercises', {
      params: { path: { challenge_id: 'ch-1' } },
    })
    expect(result.value).toEqual(exercises)
    expect(error.value).toBe(false)
  })

  it('sets error and an empty list when the request fails', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { exercises, isLoading, error } = useListChallengeExercises('ch-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(exercises.value).toEqual([])
    expect(error.value).toBe(true)
  })
})
