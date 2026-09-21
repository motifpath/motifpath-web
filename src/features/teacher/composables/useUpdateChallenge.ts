import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type UpdateChallengeRequest = components['schemas']['UpdateChallengeRequest']
type Challenge = components['schemas']['Challenge']

export function useUpdateChallenge() {
  const updateChallenge = useApiMutation<[string, UpdateChallengeRequest], Challenge>(
    (coreApi, challengeId, request) =>
      coreApi.PUT('/challenges/{challenge_id}', {
        params: { path: { challenge_id: challengeId } },
        body: request,
      }),
    'Failed to update the challenge',
  )

  return { updateChallenge }
}
