import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type CreateExpandedContentRequest = components['schemas']['CreateExpandedContentRequest']
type ExpandedContent = components['schemas']['ExpandedContent']

export function useCreateExpandedContent() {
  const createExpandedContent = useApiMutation<[string, CreateExpandedContentRequest], ExpandedContent>(
    (coreApi, contentNodeId, request) =>
      coreApi.POST('/content-nodes/{content_node_id}/expanded-content', {
        params: { path: { content_node_id: contentNodeId } },
        body: request,
      }),
    'Failed to create the expanded content item',
  )

  return { createExpandedContent }
}
