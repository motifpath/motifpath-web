import { useApiVoidMutation } from '@/shared/composables/useApiMutation'

export function useLinkExerciseToChallenge() {
  const linkExerciseToChallenge = useApiVoidMutation<[string, string]>(
    (coreApi, challengeId, exerciseId) =>
      coreApi.POST('/challenges/{challenge_id}/exercises/{exercise_id}', {
        params: { path: { challenge_id: challengeId, exercise_id: exerciseId } },
      }),
    'Failed to link the exercise to the challenge',
  )

  return { linkExerciseToChallenge }
}

export function useUnlinkExerciseFromChallenge() {
  const unlinkExerciseFromChallenge = useApiVoidMutation<[string, string]>(
    (coreApi, challengeId, exerciseId) =>
      coreApi.DELETE('/challenges/{challenge_id}/exercises/{exercise_id}', {
        params: { path: { challenge_id: challengeId, exercise_id: exerciseId } },
      }),
    'Failed to unlink the exercise from the challenge',
  )

  return { unlinkExerciseFromChallenge }
}
