import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'

export function useLinkExerciseToChallenge() {
  const { coreApi } = useApi()

  async function linkExerciseToChallenge(challengeId: string, exerciseId: string): Promise<void> {
    const { error } = await coreApi.POST('/challenges/{challenge_id}/exercises/{exercise_id}', {
      params: { path: { challenge_id: challengeId, exercise_id: exerciseId } },
    })
    if (error) {
      throw new Error(describeApiError(error, 'Failed to link the exercise to the challenge'))
    }
  }

  return { linkExerciseToChallenge }
}

export function useUnlinkExerciseFromChallenge() {
  const { coreApi } = useApi()

  async function unlinkExerciseFromChallenge(challengeId: string, exerciseId: string): Promise<void> {
    const { error } = await coreApi.DELETE('/challenges/{challenge_id}/exercises/{exercise_id}', {
      params: { path: { challenge_id: challengeId, exercise_id: exerciseId } },
    })
    if (error) {
      throw new Error(describeApiError(error, 'Failed to unlink the exercise from the challenge'))
    }
  }

  return { unlinkExerciseFromChallenge }
}
