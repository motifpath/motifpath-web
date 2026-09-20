import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']

export function useListContentNodes() {
  const {
    items: contentNodes,
    isLoading,
    error,
    retry,
  } = useApiList<ContentNode>((coreApi) => coreApi.GET('/content-nodes', {}))

  return { contentNodes, isLoading, error, retry }
}
