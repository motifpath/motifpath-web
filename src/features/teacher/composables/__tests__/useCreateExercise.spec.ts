import { describe, expect, it, vi } from 'vitest'

import { plainTextPrompt } from '@/shared/testUtils/promptDocument'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useCreateExercise } from '@/features/teacher/composables/useCreateExercise'

describe('useCreateExercise', () => {
  it('posts the request and returns the created exercise', async () => {
    const exercise = { exercise_id: 'e-1', challenge_ids: [] }
    POST.mockResolvedValueOnce({ data: exercise, error: undefined, response: { status: 201 } })

    const { createExercise } = useCreateExercise()
    const request = { title: 't', prompt: plainTextPrompt('p'), exercise_type: 'text_response' as const, skill_ids: [], concept_ids: [], options: [], language_codes: ['any'] }

    const result = await createExercise(request)

    expect(POST).toHaveBeenCalledWith('/exercises', { body: request })
    expect(result).toEqual(exercise)
  })

  it('throws with the server error message when creation fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { createExercise } = useCreateExercise()

    await expect(
      createExercise({ title: 't', prompt: plainTextPrompt('p'), exercise_type: 'text_response', skill_ids: [], concept_ids: [], options: [], language_codes: ['any'] }),
    ).rejects.toThrow('Boom')
  })

  it('throws with per-field detail when the server returns a validation error', async () => {
    POST.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'request failed validation', errors: [{ field: '/prompt', reason: 'must not be empty' }] },
      response: { status: 422 },
    })

    const { createExercise } = useCreateExercise()

    await expect(
      createExercise({ title: 't', prompt: plainTextPrompt(''), exercise_type: 'text_response', skill_ids: [], concept_ids: [], options: [], language_codes: ['any'] }),
    ).rejects.toThrow('Request failed validation:\n• /prompt: must not be empty')
  })

  it('throws a fallback message when the server gives no error message', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } })

    const { createExercise } = useCreateExercise()

    await expect(
      createExercise({ title: 't', prompt: plainTextPrompt('p'), exercise_type: 'text_response', skill_ids: [], concept_ids: [], options: [], language_codes: ['any'] }),
    ).rejects.toThrow('Failed to create the exercise')
  })
})
