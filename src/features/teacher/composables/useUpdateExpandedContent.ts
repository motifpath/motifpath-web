import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type UpdateExpandedContentRequest = components['schemas']['UpdateExpandedContentRequest']
type ExpandedContent = components['schemas']['ExpandedContent']

export function useUpdateExpandedContent() {
  const { coreApi } = useApi()

  async function updateExpandedContent(
    expandedContentId: string,
    request: UpdateExpandedContentRequest,
  ): Promise<ExpandedContent> {
    const { data, error } = await coreApi.PUT('/expanded-content/{expanded_content_id}', {
      params: { path: { expanded_content_id: expandedContentId } },
      body: request,
    })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to update the expanded content item'))
    }
    return data
  }

  return { updateExpandedContent }
}

export function useDeleteExpandedContent() {
  const { coreApi } = useApi()

  async function deleteExpandedContent(expandedContentId: string): Promise<void> {
    const { error } = await coreApi.DELETE('/expanded-content/{expanded_content_id}', {
      params: { path: { expanded_content_id: expandedContentId } },
    })
    if (error) {
      throw new Error(describeApiError(error, 'Failed to delete the expanded content item'))
    }
  }

  return { deleteExpandedContent }
}
