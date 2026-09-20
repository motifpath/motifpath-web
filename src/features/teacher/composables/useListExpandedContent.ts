import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

export function useListExpandedContent(contentNodeId: string) {
  const { items, isLoading, error, retry } = useApiList<ExpandedContent, [string]>(
    async (coreApi, id) => {
      const result = await coreApi.GET('/content-nodes/{content_node_id}/expanded-content', {
        params: { path: { content_node_id: id } },
      })
      return { data: result.data?.items, error: result.error }
    },
    contentNodeId,
  )

  return { items, isLoading, error, retry }
}
