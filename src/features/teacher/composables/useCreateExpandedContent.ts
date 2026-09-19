import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type CreateExpandedContentRequest = components['schemas']['CreateExpandedContentRequest']
type ExpandedContent = components['schemas']['ExpandedContent']

export function useCreateExpandedContent() {
  const { coreApi } = useApi()

  async function createExpandedContent(
    contentNodeId: string,
    request: CreateExpandedContentRequest,
  ): Promise<ExpandedContent> {
    const { data, error } = await coreApi.POST('/content-nodes/{content_node_id}/expanded-content', {
      params: { path: { content_node_id: contentNodeId } },
      body: request,
    })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to create the expanded content item'))
    }
    return data
  }

  return { createExpandedContent }
}
