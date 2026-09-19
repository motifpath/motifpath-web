import { describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useCreateChallenge } from '@/features/teacher/composables/useCreateChallenge'

describe('useCreateChallenge', () => {
  it('posts the request and returns the created challenge', async () => {
    const challenge = { challenge_id: 'ch-1', content_node_id: 'cn-1' }
    POST.mockResolvedValueOnce({ data: challenge, error: undefined, response: { status: 201 } })

    const { createChallenge } = useCreateChallenge()
    const request = { subject_tag: 'triad-shapes', pass_threshold: 80, shuffle_exercises: false, shuffle_options: false }

    const result = await createChallenge('cn-1', request)

    expect(POST).toHaveBeenCalledWith('/content-nodes/{content_node_id}/challenges', {
      params: { path: { content_node_id: 'cn-1' } },
      body: request,
    })
    expect(result).toEqual(challenge)
  })

  it('throws with the server error message when creation fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { createChallenge } = useCreateChallenge()

    await expect(
      createChallenge('cn-1', { subject_tag: 't', pass_threshold: 80, shuffle_exercises: false, shuffle_options: false }),
    ).rejects.toThrow('Boom')
  })

  it('throws a fallback message when the server gives no error message', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } })

    const { createChallenge } = useCreateChallenge()

    await expect(
      createChallenge('cn-1', { subject_tag: 't', pass_threshold: 80, shuffle_exercises: false, shuffle_options: false }),
    ).rejects.toThrow('Failed to create the challenge')
  })
})
