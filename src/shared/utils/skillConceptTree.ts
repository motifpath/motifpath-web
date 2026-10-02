import { pickLocalizedName } from '@/shared/utils/localizedName'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeEdge = components['schemas']['KnowledgeEdge']

export interface TreeNode {
  id: string
  name: string
  parent_id: string | null
  /** Extra text the picker's search matches besides the name — other languages' names, the key. */
  searchTerms?: string[]
  /** The instruments the node is for; empty means every instrument. */
  instrumentIds?: string[]
}

/** Knowledge nodes as picker tree nodes, named in `languageCode` (falling back to English). */
export function toTreeNodes(nodes: KnowledgeNode[], languageCode: string): TreeNode[] {
  return nodes.map((node) => {
    const name = pickLocalizedName(node.names, languageCode)
    return {
      id: node.node_id,
      name,
      parent_id: node.parent_id,
      searchTerms: Array.from(new Set([name, ...Object.values(node.names), node.key])),
      instrumentIds: node.instrument_ids,
    }
  })
}

/**
 * Whether a node may classify content for `contentInstrumentIds` — the rule the
 * server enforces: a node for every instrument suits anything; an
 * instrument-specific node suits content for at least one of its instruments,
 * so never content for every instrument.
 */
export function suitsInstruments(node: TreeNode, contentInstrumentIds: string[]): boolean {
  const nodeInstrumentIds = node.instrumentIds ?? []
  if (nodeInstrumentIds.length === 0) return true
  return contentInstrumentIds.some((id) => nodeInstrumentIds.includes(id))
}

/**
 * Nodes linked by an applies edge to the picked ones: the concepts the picked
 * skills apply, or the skills that apply the picked concepts. Suggestions only —
 * applies never restricts what may be picked.
 */
export function appliesSuggestions(edges: KnowledgeEdge[], pickedIds: string[], suggest: 'skills' | 'concepts'): string[] {
  const picked = new Set(pickedIds)
  const ids = edges
    .filter((edge) => edge.type === 'applies')
    .filter((edge) => picked.has(suggest === 'concepts' ? edge.from_id : edge.to_id))
    .map((edge) => (suggest === 'concepts' ? edge.to_id : edge.from_id))
  return Array.from(new Set(ids))
}

/** A node's ancestor ids, nearest parent first — excludes the node itself. */
export function ancestorIds(nodes: TreeNode[], node: TreeNode): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const ids: string[] = []
  let current = node
  while (current.parent_id) {
    const parent = byId.get(current.parent_id)
    if (!parent) break
    ids.push(parent.id)
    current = parent
  }
  return ids
}

/** Every id transitively parented by `id`, excluding `id` itself. */
export function descendantIds(nodes: TreeNode[], id: string): string[] {
  const children = nodes.filter((n) => n.parent_id === id)
  return children.flatMap((child) => [child.id, ...descendantIds(nodes, child.id)])
}

/**
 * Drops every selected id that is an ancestor of another selected id. Tagging
 * content with a node also tags it with that node's ancestors, so filtering by
 * the whole selection would match everything under the broadest pick — the
 * most specific picks are what narrow the results.
 */
export function mostSpecificIds(nodes: TreeNode[], ids: string[]): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const coveredAncestors = new Set(
    ids.flatMap((id) => {
      const node = byId.get(id)
      return node ? ancestorIds(nodes, node) : []
    }),
  )
  return ids.filter((id) => !coveredAncestors.has(id))
}
