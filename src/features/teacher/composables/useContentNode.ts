import { useApiItem } from '@/shared/composables/useApiItem'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']

export function useContentNode(contentNodeId: string) {
  const {
    item: contentNode,
    isLoading,
    error,
    retry,
  } = useApiItem<ContentNode>((coreApi) =>
    coreApi.GET('/content-nodes/{content_node_id}', {
      params: { path: { content_node_id: contentNodeId } },
    }),
  )

  return { contentNode, isLoading, error, retry }
}
