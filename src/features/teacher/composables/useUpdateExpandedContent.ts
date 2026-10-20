import { useApiMutation, useApiVoidMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type UpdateExpandedContentRequest = components['schemas']['UpdateExpandedContentRequest']
type ExpandedContent = components['schemas']['ExpandedContent']

export function useUpdateExpandedContent() {
  const updateExpandedContent = useApiMutation<[string, UpdateExpandedContentRequest], ExpandedContent>(
    (coreApi, expandedContentId, request) =>
      coreApi.PUT('/expanded-content/{expanded_content_id}', {
        params: { path: { expanded_content_id: expandedContentId } },
        body: request,
      }),
    'Failed to update the expanded content item',
  )

  return { updateExpandedContent }
}

export function useDeleteExpandedContent() {
  const deleteExpandedContent = useApiVoidMutation<[string]>(
    (coreApi, expandedContentId) =>
      coreApi.DELETE('/expanded-content/{expanded_content_id}', {
        params: { path: { expanded_content_id: expandedContentId } },
      }),
    'Failed to delete the expanded content item',
  )

  return { deleteExpandedContent }
}
