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
export function appliesSuggestions(
  edges: KnowledgeEdge[],
  pickedIds: string[],
  suggest: 'skills' | 'concepts',
): string[] {
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

export interface TreeRow {
  node: TreeNode
  depth: number
  hasChildren: boolean
  expanded: boolean
  /** True when the row matched the active search or filter; false for an ancestor shown for context. */
  matched: boolean
}

/**
 * The rows of a tree view, depth-first with siblings sorted by name. Only nodes
 * passing `include` appear; a node whose parent is excluded is listed as a root.
 * Without `match`, a node's children show only when it is in `expandedIds`.
 * With `match`, the matching nodes show with all their ancestors, fully expanded.
 */
export function treeRows(
  nodes: TreeNode[],
  options: {
    include: (node: TreeNode) => boolean
    match: ((node: TreeNode) => boolean) | null
    expandedIds: Set<string>
  },
): TreeRow[] {
  const included = nodes.filter(options.include)
  const { match } = options

  let shown = included
  const matchedIds = new Set<string>()
  if (match) {
    const keep = new Set<string>()
    for (const node of included) {
      if (!match(node)) continue
      matchedIds.add(node.id)
      keep.add(node.id)
      for (const id of ancestorIds(included, node)) keep.add(id)
    }
    shown = included.filter((n) => keep.has(n.id))
  }

  const shownIds = new Set(shown.map((n) => n.id))
  const parentOf = (node: TreeNode) =>
    node.parent_id && shownIds.has(node.parent_id) ? node.parent_id : null
  const children = new Map<string | null, TreeNode[]>()
  for (const node of shown) {
    const siblings = children.get(parentOf(node)) ?? []
    siblings.push(node)
    children.set(parentOf(node), siblings)
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.name.localeCompare(b.name))

  const rows: TreeRow[] = []
  function visit(parentId: string | null, depth: number) {
    for (const node of children.get(parentId) ?? []) {
      const hasChildren = children.has(node.id)
      const expanded = hasChildren && (match !== null || options.expandedIds.has(node.id))
      rows.push({
        node,
        depth,
        hasChildren,
        expanded,
        matched: match === null || matchedIds.has(node.id),
      })
      if (expanded) visit(node.id, depth + 1)
    }
  }
  visit(null, 0)
  return rows
}

/** Whether `id` and every node under it are selected. */
function wholeSubtreeSelected(nodes: TreeNode[], id: string, selected: Set<string>): boolean {
  return selected.has(id) && descendantIds(nodes, id).every((descendant) => selected.has(descendant))
}

/**
 * The ids to filter by, for a filter that matches any of them. Picking a node
 * also picks its ancestors, which would widen the filter to everything under
 * them — so a picked node is dropped when only some of its subtree is picked.
 * A node picked with its whole subtree stays, together with the subtree.
 */
export function filterIds(nodes: TreeNode[], selectedIds: string[]): string[] {
  const selected = new Set(selectedIds)
  return selectedIds.filter(
    (id) =>
      wholeSubtreeSelected(nodes, id, selected) ||
      !descendantIds(nodes, id).some((descendant) => selected.has(descendant)),
  )
}

/**
 * The selection as few entries as it takes to read it: a fully picked subtree
 * shows as its top node, with `more` counting the nodes under it; a parent
 * picked only because some children were is left out, since its children's
 * entries already name it. Entries keep the order of `selectedIds`.
 */
export function selectionSummary(nodes: TreeNode[], selectedIds: string[]): { id: string; more: number }[] {
  const selected = new Set(selectedIds)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return selectedIds
    .filter((id) => {
      if (wholeSubtreeSelected(nodes, id, selected)) {
        const parentId = byId.get(id)?.parent_id
        return !parentId || !wholeSubtreeSelected(nodes, parentId, selected)
      }
      return !descendantIds(nodes, id).some((descendant) => selected.has(descendant))
    })
    .map((id) => ({
      id,
      more: wholeSubtreeSelected(nodes, id, selected) ? descendantIds(nodes, id).length : 0,
    }))
}
