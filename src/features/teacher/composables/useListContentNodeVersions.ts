import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type ContentNodeVersion = components['schemas']['ContentNodeVersion']

export function useListContentNodeVersions(contentNodeId: string) {
  const {
    items: versions,
    isLoading,
    error,
    retry,
  } = useApiList<ContentNodeVersion, [string]>(
    (coreApi, id) =>
      coreApi.GET('/content-nodes/{content_node_id}/versions', { params: { path: { content_node_id: id } } }),
    contentNodeId,
  )

  return { versions, isLoading, error, retry }
}
