import { beforeEach, describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
const PUT = vi.fn()
const DELETE = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST, PUT, DELETE }, eventApi: {} }),
}))

import { useSaveChallenge } from '@/features/teacher/composables/useSaveChallenge'

const fields = {
  subject_skill_id: 's-1',
  pass_threshold: 70,
  shuffle_exercises: false,
  shuffle_options: false,
}

const challenge = {
  challenge_id: 'ch-1',
  content_node_id: 'cn-1',
  subject_skill_id: 's-1',
  pass_threshold: 70,
  shuffle_exercises: false,
  shuffle_options: false,
  created_at: '2026-01-01T00:00:00Z',
}

const ok = { data: challenge, error: undefined, response: { status: 200 } }
const noContent = { error: undefined, response: { status: 204 } }

describe('useSaveChallenge', () => {
  beforeEach(() => {
    POST.mockReset()
    PUT.mockReset()
    DELETE.mockReset()
  })

  it('creates the challenge, then links every exercise in the order given', async () => {
    POST.mockResolvedValueOnce(ok).mockResolvedValue(noContent)

    const { saveChallenge } = useSaveChallenge()
    const saved = await saveChallenge({
      contentNodeId: 'cn-1',
      fields,
      exerciseIds: ['e-2', 'e-1'],
      linkedExerciseIds: [],
    })

    expect(saved.challenge_id).toBe('ch-1')
    expect(POST.mock.calls).toEqual([
      ['/content-nodes/{content_node_id}/challenges', { params: { path: { content_node_id: 'cn-1' } }, body: fields }],
      ['/challenges/{challenge_id}/exercises/{exercise_id}', { params: { path: { challenge_id: 'ch-1', exercise_id: 'e-2' } } }],
      ['/challenges/{challenge_id}/exercises/{exercise_id}', { params: { path: { challenge_id: 'ch-1', exercise_id: 'e-1' } } }],
    ])
  })

  it('updates an existing challenge and only links/unlinks the difference', async () => {
    PUT.mockResolvedValueOnce(ok)
    DELETE.mockResolvedValue(noContent)
    POST.mockResolvedValue(noContent)

    const { saveChallenge } = useSaveChallenge()
    await saveChallenge({
      contentNodeId: 'cn-1',
      challengeId: 'ch-1',
      fields,
      exerciseIds: ['e-2', 'e-3'],
      linkedExerciseIds: ['e-1', 'e-2'],
    })

    expect(PUT).toHaveBeenCalledWith('/challenges/{challenge_id}', {
      params: { path: { challenge_id: 'ch-1' } },
      body: fields,
    })
    expect(DELETE.mock.calls).toEqual([
      ['/challenges/{challenge_id}/exercises/{exercise_id}', { params: { path: { challenge_id: 'ch-1', exercise_id: 'e-1' } } }],
    ])
    expect(POST.mock.calls).toEqual([
      ['/challenges/{challenge_id}/exercises/{exercise_id}', { params: { path: { challenge_id: 'ch-1', exercise_id: 'e-3' } } }],
    ])
  })

  it('refuses to save a challenge with no exercises, without calling the API', async () => {
    const { saveChallenge } = useSaveChallenge()

    await expect(
      saveChallenge({ contentNodeId: 'cn-1', fields, exerciseIds: [], linkedExerciseIds: [] }),
    ).rejects.toThrow('at least one exercise')

    expect(POST).not.toHaveBeenCalled()
    expect(PUT).not.toHaveBeenCalled()
  })

  it('stops linking and rethrows when a link fails', async () => {
    POST.mockResolvedValueOnce(ok)
      .mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 400 } })
      .mockResolvedValue(noContent)

    const { saveChallenge } = useSaveChallenge()

    await expect(
      saveChallenge({ contentNodeId: 'cn-1', fields, exerciseIds: ['e-1', 'e-2'], linkedExerciseIds: [] }),
    ).rejects.toThrow('Boom')

    expect(POST).toHaveBeenCalledTimes(2)
  })
})
