import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type Challenge = components['schemas']['Challenge']

export function useListContentNodeChallenges(contentNodeId: string) {
  const {
    items: challenges,
    isLoading,
    error,
    retry,
  } = useApiList<Challenge, [string]>(
    (coreApi, id) =>
      coreApi.GET('/content-nodes/{content_node_id}/challenges', { params: { path: { content_node_id: id } } }),
    contentNodeId,
  )

  return { challenges, isLoading, error, retry }
}
