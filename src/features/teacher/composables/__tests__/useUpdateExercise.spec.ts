import { describe, expect, it, vi } from 'vitest'

import { plainTextPrompt } from '@/shared/testUtils/promptDocument'

const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PUT }, eventApi: {} }),
}))

import { useUpdateExercise } from '@/features/teacher/composables/useUpdateExercise'

describe('useUpdateExercise', () => {
  it('puts the request and returns the updated exercise', async () => {
    const exercise = { exercise_id: 'e-1', challenge_ids: [] }
    PUT.mockResolvedValueOnce({ data: exercise, error: undefined, response: { status: 200 } })

    const { updateExercise } = useUpdateExercise()
    const request = { title: 't', prompt: plainTextPrompt('p'), skill_ids: [], concept_ids: [], options: [], language_codes: ['any'] }

    const result = await updateExercise('e-1', request)

    expect(PUT).toHaveBeenCalledWith('/exercises/{exercise_id}', {
      params: { path: { exercise_id: 'e-1' } },
      body: request,
    })
    expect(result).toEqual(exercise)
  })

  it('throws with the server error message when update fails', async () => {
    PUT.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { updateExercise } = useUpdateExercise()

    await expect(updateExercise('e-1', { title: 't', prompt: plainTextPrompt('p'), skill_ids: [], concept_ids: [], options: [], language_codes: ['any'] })).rejects.toThrow('Boom')
  })

  it('throws with per-field detail when the server returns a validation error', async () => {
    PUT.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'request failed validation', errors: [{ field: '/prompt', reason: 'must not be empty' }] },
      response: { status: 422 },
    })

    const { updateExercise } = useUpdateExercise()

    await expect(updateExercise('e-1', { title: 't', prompt: plainTextPrompt(''), skill_ids: [], concept_ids: [], options: [], language_codes: ['any'] })).rejects.toThrow(
      'Request failed validation:\n• /prompt: must not be empty',
    )
  })

  it('throws a fallback message when the server gives no error message', async () => {
    PUT.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } })

    const { updateExercise } = useUpdateExercise()

    await expect(updateExercise('e-1', { title: 't', prompt: plainTextPrompt('p'), skill_ids: [], concept_ids: [], options: [], language_codes: ['any'] })).rejects.toThrow(
      'Failed to update the exercise',
    )
  })
})
