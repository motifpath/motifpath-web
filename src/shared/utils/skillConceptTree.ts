export interface TreeNode {
  id: string
  name: string
  parent_id: string | null
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
