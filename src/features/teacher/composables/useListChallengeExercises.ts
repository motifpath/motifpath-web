import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

export function useListChallengeExercises(challengeId: string) {
  const {
    items: exercises,
    isLoading,
    error,
    retry,
  } = useApiList<Exercise, [string]>(
    (coreApi, id) => coreApi.GET('/challenges/{challenge_id}/exercises', { params: { path: { challenge_id: id } } }),
    challengeId,
  )

  return { exercises, isLoading, error, retry }
}
