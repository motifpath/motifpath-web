import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type ContentNodeVersion = components['schemas']['ContentNodeVersion']

export function usePublishContentNode() {
  const publishContentNode = useApiMutation<[string], ContentNodeVersion>(
    (coreApi, contentNodeId) =>
      coreApi.POST('/content-nodes/{content_node_id}/publish', {
        params: { path: { content_node_id: contentNodeId } },
      }),
    'Failed to publish the content node',
  )

  return { publishContentNode }
}
