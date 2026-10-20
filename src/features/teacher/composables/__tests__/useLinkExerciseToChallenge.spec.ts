import { describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
const DELETE = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST, DELETE }, eventApi: {} }),
}))

import {
  useLinkExerciseToChallenge,
  useUnlinkExerciseFromChallenge,
} from '@/features/teacher/composables/useLinkExerciseToChallenge'

describe('useLinkExerciseToChallenge', () => {
  it('links an exercise to a challenge', async () => {
    POST.mockResolvedValueOnce({ error: undefined, response: { status: 204 } })

    const { linkExerciseToChallenge } = useLinkExerciseToChallenge()
    await linkExerciseToChallenge('ch-1', 'ex-1')

    expect(POST).toHaveBeenCalledWith('/challenges/{challenge_id}/exercises/{exercise_id}', {
      params: { path: { challenge_id: 'ch-1', exercise_id: 'ex-1' } },
    })
  })

  it('throws with the server error message when linking fails', async () => {
    POST.mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 400 } })

    const { linkExerciseToChallenge } = useLinkExerciseToChallenge()

    await expect(linkExerciseToChallenge('ch-1', 'ex-1')).rejects.toThrow('Boom')
  })
})

describe('useUnlinkExerciseFromChallenge', () => {
  it('unlinks an exercise from a challenge', async () => {
    DELETE.mockResolvedValueOnce({ error: undefined, response: { status: 204 } })

    const { unlinkExerciseFromChallenge } = useUnlinkExerciseFromChallenge()
    await unlinkExerciseFromChallenge('ch-1', 'ex-1')

    expect(DELETE).toHaveBeenCalledWith('/challenges/{challenge_id}/exercises/{exercise_id}', {
      params: { path: { challenge_id: 'ch-1', exercise_id: 'ex-1' } },
    })
  })

  it('throws with the server error message when unlinking fails', async () => {
    DELETE.mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 400 } })

    const { unlinkExerciseFromChallenge } = useUnlinkExerciseFromChallenge()

    await expect(unlinkExerciseFromChallenge('ch-1', 'ex-1')).rejects.toThrow('Boom')
  })
})
