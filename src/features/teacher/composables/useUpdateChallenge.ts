import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type UpdateChallengeRequest = components['schemas']['UpdateChallengeRequest']
type Challenge = components['schemas']['Challenge']

export function useUpdateChallenge() {
  const { coreApi } = useApi()

  async function updateChallenge(challengeId: string, request: UpdateChallengeRequest): Promise<Challenge> {
    const { data, error } = await coreApi.PUT('/challenges/{challenge_id}', {
      params: { path: { challenge_id: challengeId } },
      body: request,
    })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to update the challenge'))
    }
    return data
  }

  return { updateChallenge }
}
