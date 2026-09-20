import { describe, expect, it, vi } from 'vitest'

const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PUT }, eventApi: {} }),
}))

import { useUpdateChallenge } from '@/features/teacher/composables/useUpdateChallenge'

describe('useUpdateChallenge', () => {
  it('puts the request and returns the updated challenge', async () => {
    const challenge = { challenge_id: 'ch-1' }
    PUT.mockResolvedValueOnce({ data: challenge, error: undefined, response: { status: 200 } })

    const { updateChallenge } = useUpdateChallenge()
    const request = { subject_skill_id: 's-1', pass_threshold: 80, shuffle_exercises: false, shuffle_options: false }

    const result = await updateChallenge('ch-1', request)

    expect(PUT).toHaveBeenCalledWith('/challenges/{challenge_id}', {
      params: { path: { challenge_id: 'ch-1' } },
      body: request,
    })
    expect(result).toEqual(challenge)
  })

  it('throws with the server error message when update fails', async () => {
    PUT.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { updateChallenge } = useUpdateChallenge()

    await expect(
      updateChallenge('ch-1', { subject_skill_id: 's-1', pass_threshold: 80, shuffle_exercises: false, shuffle_options: false }),
    ).rejects.toThrow('Boom')
  })

  it('throws a fallback message when the server gives no error message', async () => {
    PUT.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } })

    const { updateChallenge } = useUpdateChallenge()

    await expect(
      updateChallenge('ch-1', { subject_skill_id: 's-1', pass_threshold: 80, shuffle_exercises: false, shuffle_options: false }),
    ).rejects.toThrow('Failed to update the challenge')
  })
})
