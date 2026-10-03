/**
 * Item knowledge over the knowledge graph: rollups and node levels follow the
 * `part_of` tree, readiness follows `requires` edges. `applies` links never
 * carry mastery.
 */
import { fits } from '@/spikes/practice/instruments'
import type {
  GraphNode,
  KnowledgeGraph,
  KnowledgeState,
  Level,
  MasteryLevel,
  PracticeItem,
} from '@/spikes/practice/model'

export const LEVEL_ORDER: Level[] = ['new', 'learning', 'accurate', 'fluent', 'retained']

/** Share of a node's items that must reach a level for the node to reach it. */
export const NODE_LEVEL_SHARE = 0.8

export function atLeast(level: Level | null, needed: Level): boolean {
  return level !== null && LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(needed)
}

export function descendantIds(
  nodes: Pick<GraphNode, 'node_id' | 'parent_id'>[],
  id: string,
): string[] {
  const out = [id]
  for (let i = 0; i < out.length; i++) {
    for (const node of nodes) if (node.parent_id === out[i]) out.push(node.node_id)
  }
  return out
}

/** Empty `instrument_ids` means the node is for every instrument. */
export function isForInstrument(node: GraphNode | undefined, instrumentId: string): boolean {
  return (
    node !== undefined &&
    (node.instrument_ids.length === 0 || node.instrument_ids.includes(instrumentId))
  )
}

export interface Rollup {
  total: number
  by_level: Record<Level, number>
  fading: number
  /** Mean fluency over seen items; 0 when none seen. */
  mean_fluency: number
}

/** The items in a node's subtree; for one instrument, only those that suit it. */
export function itemsUnder(
  nodes: GraphNode[],
  items: PracticeItem[],
  id: string,
  instrumentId?: string,
): PracticeItem[] {
  const ids = new Set(descendantIds(nodes, id))
  return items.filter(
    (i) =>
      (instrumentId === undefined || fits(i, instrumentId)) &&
      (i.skill_ids.some((s) => ids.has(s)) || i.concept_ids.some((c) => ids.has(c))),
  )
}

export function rollup(
  nodes: GraphNode[],
  items: PracticeItem[],
  states: Map<string, KnowledgeState>,
  id: string,
): Rollup {
  const under = itemsUnder(nodes, items, id)
  const by_level: Record<Level, number> = {
    new: 0,
    learning: 0,
    accurate: 0,
    fluent: 0,
    retained: 0,
  }
  let fading = 0
  let fluencySum = 0
  let seen = 0
  for (const item of under) {
    const state = states.get(item.item_key)
    if (!state || state.attempts === 0) {
      by_level.new++
      continue
    }
    by_level[state.effective_level]++
    if (state.fading) fading++
    fluencySum += state.fluency
    seen++
  }
  return { total: under.length, by_level, fading, mean_fluency: seen ? fluencySum / seen : 0 }
}

/**
 * A node's own level: the highest level that at least `NODE_LEVEL_SHARE` of the
 * items in its subtree show now. Unseen items count as new, so a node practised
 * in one corner stays new. A node with nothing to practise has no level at all.
 * For an instrument, only items that suit it count: a guitarist's notes on the
 * low strings say nothing about the same node on bass.
 */
export function nodeLevel(
  nodes: GraphNode[],
  items: PracticeItem[],
  states: Map<string, KnowledgeState>,
  id: string,
  instrumentId?: string,
): Level | null {
  const under = itemsUnder(nodes, items, id, instrumentId)
  if (under.length === 0) return null
  const shown = under.map((i) => {
    const s = states.get(i.item_key)
    return s && s.attempts > 0 ? s.effective_level : 'new'
  })
  for (let l = LEVEL_ORDER.length - 1; l > 0; l--) {
    const level = LEVEL_ORDER[l]!
    if (shown.filter((s) => atLeast(s, level)).length >= NODE_LEVEL_SHARE * under.length)
      return level
  }
  return 'new'
}

export interface MissingRequirement {
  node_id: string
  needed: MasteryLevel
  /** The required node's level now; null when it has nothing to practise. */
  has: Level | null
}

export interface Readiness {
  met: number
  total: number
  missing: MissingRequirement[]
}

/**
 * How many of a node's `requires` edges the student meets, counting only edges
 * whose both ends are for the student's instrument. Informs, never gates.
 */
export function readiness(
  graph: KnowledgeGraph,
  items: PracticeItem[],
  states: Map<string, KnowledgeState>,
  id: string,
  instrumentId: string,
): Readiness {
  const edges = requiresFor(graph, instrumentId).filter((e) => e.from_id === id)
  const missing: MissingRequirement[] = []
  for (const e of edges) {
    const needed = e.level ?? 'accurate'
    const has = nodeLevel(graph.nodes, items, states, e.to_id, instrumentId)
    if (!atLeast(has, needed)) missing.push({ node_id: e.to_id, needed, has })
  }
  return { met: edges.length - missing.length, total: edges.length, missing }
}

/** The `requires` edges that count for an instrument: both ends are for it. */
function requiresFor(graph: KnowledgeGraph, instrumentId: string) {
  const byId = new Map(graph.nodes.map((n) => [n.node_id, n]))
  return graph.edges.filter(
    (e) =>
      e.type === 'requires' &&
      isForInstrument(byId.get(e.from_id), instrumentId) &&
      isForInstrument(byId.get(e.to_id), instrumentId),
  )
}

/**
 * How far a node sits from the basics on an instrument: the longest chain of
 * requirements below it. Ranks next steps by the graph alone; the requires
 * graph is acyclic.
 */
export function requiresDepth(graph: KnowledgeGraph, id: string, instrumentId: string): number {
  const edges = requiresFor(graph, instrumentId)
  const memo = new Map<string, number>()
  const depth = (node: string): number => {
    if (!memo.has(node)) {
      const below = edges.filter((e) => e.from_id === node).map((e) => depth(e.to_id) + 1)
      memo.set(node, below.length ? Math.max(...below) : 0)
    }
    return memo.get(node)!
  }
  return depth(id)
}
