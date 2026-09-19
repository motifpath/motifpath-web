import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type CreateChallengeRequest = components['schemas']['CreateChallengeRequest']
type Challenge = components['schemas']['Challenge']

export function useCreateChallenge() {
  const { coreApi } = useApi()

  async function createChallenge(contentNodeId: string, request: CreateChallengeRequest): Promise<Challenge> {
    const { data, error } = await coreApi.POST('/content-nodes/{content_node_id}/challenges', {
      params: { path: { content_node_id: contentNodeId } },
      body: request,
    })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to create the challenge'))
    }
    return data
  }

  return { createChallenge }
}
