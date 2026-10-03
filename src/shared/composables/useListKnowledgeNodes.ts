import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeNodeKind = components['schemas']['KnowledgeNodeKind']

/** Every knowledge node of one kind — the skill tree or the concept tree. */
export function useListKnowledgeNodes(kind: KnowledgeNodeKind) {
  const {
    items: nodes,
    isLoading,
    error,
    retry,
    refresh,
  } = useApiList<KnowledgeNode>((coreApi) =>
    coreApi.GET('/knowledge-nodes', { params: { query: { kind } } }),
  )

  return { nodes, isLoading, error, retry, refresh }
}
