import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type UpdateContentNodeRequest = components['schemas']['UpdateContentNodeRequest']
type ContentNode = components['schemas']['ContentNode']

export function useUpdateContentNode() {
  const updateContentNode = useApiMutation<[string, UpdateContentNodeRequest], ContentNode>(
    (coreApi, contentNodeId, request) =>
      coreApi.PUT('/content-nodes/{content_node_id}', {
        params: { path: { content_node_id: contentNodeId } },
        body: request,
      }),
    'Failed to update the content node',
  )

  return { updateContentNode }
}
