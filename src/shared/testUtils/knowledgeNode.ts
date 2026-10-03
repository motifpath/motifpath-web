import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']

/**
 * A knowledge node for test fixtures: a root skill for every instrument, named
 * after its id in English only unless `overrides` says otherwise.
 */
export function knowledgeNode(
  nodeId: string,
  overrides: Partial<KnowledgeNode> = {},
): KnowledgeNode {
  const names = overrides.names ?? { en: nodeId }
  return {
    node_id: nodeId,
    kind: 'skill',
    key: nodeId,
    descriptions: null,
    languages: Object.keys(names).sort(),
    parent_id: null,
    instrument_ids: [],
    ...overrides,
    names,
  }
}
