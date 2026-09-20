import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type CreateChallengeRequest = components['schemas']['CreateChallengeRequest']
type Challenge = components['schemas']['Challenge']

export function useCreateChallenge() {
  const createChallenge = useApiMutation<[string, CreateChallengeRequest], Challenge>(
    (coreApi, contentNodeId, request) =>
      coreApi.POST('/content-nodes/{content_node_id}/challenges', {
        params: { path: { content_node_id: contentNodeId } },
        body: request,
      }),
    'Failed to create the challenge',
  )

  return { createChallenge }
}
