import type { components } from '@/api/generated/core-domain'

type KnowledgeEdge = components['schemas']['KnowledgeEdge']

const KEY_MAX_LENGTH = 100
const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** A key for a new node, derived from its English name: lowercase kebab-case, accents dropped. */
export function suggestKey(englishName: string): string {
  return englishName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, KEY_MAX_LENGTH)
    .replace(/-+$/, '')
}

/** Whether `key` has the shape the server accepts for a node key. */
export function isValidKey(key: string): boolean {
  return key.length <= KEY_MAX_LENGTH && KEY_PATTERN.test(key)
}

/**
 * Whether a node for `instrumentIds` may sit under a parent for
 * `parentInstrumentIds` — a node is never wider than its parent. Empty means
 * every instrument.
 */
export function fitsWithin(instrumentIds: string[], parentInstrumentIds: string[]): boolean {
  if (parentInstrumentIds.length === 0) return true
  if (instrumentIds.length === 0) return false
  return instrumentIds.every((id) => parentInstrumentIds.includes(id))
}

/**
 * The shortest chain of requires links leading from `fromId` to `toId`, both
 * ends included, or null when `fromId` doesn't (even indirectly) require `toId`.
 */
export function requiresChain(edges: KnowledgeEdge[], fromId: string, toId: string): string[] | null {
  const next = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.type !== 'requires') continue
    next.set(edge.from_id, [...(next.get(edge.from_id) ?? []), edge.to_id])
  }

  const cameFrom = new Map<string, string | null>([[fromId, null]])
  const queue = [fromId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === toId) {
      const chain: string[] = []
      for (let id: string | null = current; id !== null; id = cameFrom.get(id) ?? null) chain.unshift(id)
      return chain
    }
    for (const id of next.get(current) ?? []) {
      if (cameFrom.has(id)) continue
      cameFrom.set(id, current)
      queue.push(id)
    }
  }
  return null
}
