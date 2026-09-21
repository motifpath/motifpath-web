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
