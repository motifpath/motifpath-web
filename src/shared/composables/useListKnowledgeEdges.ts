import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type KnowledgeEdge = components['schemas']['KnowledgeEdge']
type KnowledgeEdgeType = components['schemas']['KnowledgeEdgeType']

/** Every knowledge edge of one type, e.g. all the applies links. */
export function useListKnowledgeEdges(type: KnowledgeEdgeType) {
  const {
    items: edges,
    isLoading,
    error,
    retry,
  } = useApiList<KnowledgeEdge>((coreApi) =>
    coreApi.GET('/knowledge-edges', { params: { query: { type } } }),
  )

  return { edges, isLoading, error, retry }
}
