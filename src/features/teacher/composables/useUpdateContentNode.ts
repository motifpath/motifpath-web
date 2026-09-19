import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type UpdateContentNodeRequest = components['schemas']['UpdateContentNodeRequest']
type ContentNode = components['schemas']['ContentNode']

export function useUpdateContentNode() {
  const { coreApi } = useApi()

  async function updateContentNode(contentNodeId: string, request: UpdateContentNodeRequest): Promise<ContentNode> {
    const { data, error } = await coreApi.PUT('/content-nodes/{content_node_id}', {
      params: { path: { content_node_id: contentNodeId } },
      body: request,
    })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to update the content node'))
    }
    return data
  }

  return { updateContentNode }
}
