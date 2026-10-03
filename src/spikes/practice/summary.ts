/**
 * One derived document per student for the home screen, so opening the app is
 * one read. Organised by the knowledge graph, never by kind of exercise:
 * progress this week first, then improvement opportunities framed as next steps.
 *
 * Only practice nodes (nodes with items of their own) get numbers. An area (a
 * root) only groups them: a single level for a wide area reads "new" long after
 * the student has made real progress in one corner of it.
 */
import {
  atLeast,
  isForInstrument,
  LEVEL_ORDER,
  nodeLevel,
  readiness,
  requiresDepth,
} from '@/spikes/practice/graph'
import { fits } from '@/spikes/practice/instruments'
import type {
  Evidence,
  GraphNode,
  KnowledgeGraph,
  KnowledgeState,
  Level,
  PracticeItem,
} from '@/spikes/practice/model'

const DAY_MS = 86_400_000
/** Smallest change in accuracy or fluency worth reporting as progress. */
const NOTICEABLE = 0.02
const MAX_START_SUGGESTIONS = 3

export interface SummaryInput {
  graph: KnowledgeGraph
  items: PracticeItem[]
  instrument_id: string
  now: Date
  states_now: Map<string, KnowledgeState>
  states_week_ago: Map<string, KnowledgeState>
  evidence: Evidence[]
}

export interface NodeSnapshot {
  level: Level | null
  /** Items started out of `total`. */
  met: number
  total: number
  /** Means over started items; null when none started. */
  accuracy: number | null
  fluency: number | null
}

export interface NodeProgress {
  node_id: string
  from: NodeSnapshot
  to: NodeSnapshot
}

export type Opportunity =
  | { kind: 'refresh'; node_id: string; count: number }
  | { kind: 'strengthen'; node_id: string; count: number }
  | { kind: 'start'; node_id: string }

export interface Area {
  node_id: string
  nodes: (NodeSnapshot & { node_id: string })[]
}

export interface StudentSummary {
  generated_at: string
  practice_days_last_7: number
  progress: NodeProgress[]
  opportunities: Opportunity[]
  areas: Area[]
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null

function rootOf(byId: Map<string, GraphNode>, id: string): string {
  let node = byId.get(id)!
  while (node.parent_id !== null) node = byId.get(node.parent_id)!
  return node.node_id
}

export function summarize(input: SummaryInput): StudentSummary {
  const { graph, items, now } = input
  const byId = new Map(graph.nodes.map((n) => [n.node_id, n]))
  const direct = (id: string) =>
    items.filter(
      (i) =>
        fits(i, input.instrument_id) && (i.skill_ids.includes(id) || i.concept_ids.includes(id)),
    )
  const practiceNodes = graph.nodes.filter(
    (n) => isForInstrument(n, input.instrument_id) && direct(n.node_id).length > 0,
  )
  const started = (states: Map<string, KnowledgeState>, i: PracticeItem) =>
    (states.get(i.item_key)?.attempts ?? 0) > 0

  const snapshot = (id: string, states: Map<string, KnowledgeState>): NodeSnapshot => {
    const own = direct(id)
    const seen = own.filter((i) => started(states, i)).map((i) => states.get(i.item_key)!)
    return {
      level: nodeLevel(graph.nodes, items, states, id, input.instrument_id),
      met: seen.length,
      total: own.length,
      accuracy: mean(seen.map((s) => s.accuracy)),
      fluency: mean(seen.map((s) => s.fluency)),
    }
  }

  const gain = (p: NodeProgress) =>
    (p.to.accuracy ?? 0) -
    (p.from.accuracy ?? 0) +
    ((p.to.fluency ?? 0) - (p.from.fluency ?? 0)) +
    (p.to.met - p.from.met) / p.to.total
  const improved = (p: NodeProgress) =>
    p.to.met > p.from.met ||
    LEVEL_ORDER.indexOf(p.to.level ?? 'new') > LEVEL_ORDER.indexOf(p.from.level ?? 'new') ||
    (p.to.accuracy ?? 0) - (p.from.accuracy ?? 0) >= NOTICEABLE ||
    (p.to.fluency ?? 0) - (p.from.fluency ?? 0) >= NOTICEABLE
  const progress = practiceNodes
    .map((n) => ({
      node_id: n.node_id,
      from: snapshot(n.node_id, input.states_week_ago),
      to: snapshot(n.node_id, input.states_now),
    }))
    .filter(improved)
    .sort((a, b) => gain(b) - gain(a))

  const opportunities: Opportunity[] = []
  for (const n of practiceNodes) {
    const states = direct(n.node_id).map((i) => input.states_now.get(i.item_key))
    const refresh = states.filter((s) => s && s.attempts > 0 && s.fading).length
    const strengthen = states.filter(
      (s) => s && s.attempts > 0 && !s.fading && !atLeast(s.effective_level, 'accurate'),
    ).length
    if (refresh) opportunities.push({ kind: 'refresh', node_id: n.node_id, count: refresh })
    if (strengthen)
      opportunities.push({ kind: 'strengthen', node_id: n.node_id, count: strengthen })
  }
  const ready = practiceNodes
    .filter(
      (n) => n.kind === 'skill' && direct(n.node_id).every((i) => !started(input.states_now, i)),
    )
    .map((n) => ({
      n,
      r: readiness(graph, items, input.states_now, n.node_id, input.instrument_id),
    }))
    .filter(({ r }) => r.met === r.total)
    // Next steps that build on something the student has come first, then the nearest to the basics.
    .sort(
      (a, b) =>
        Number(b.r.total > 0) - Number(a.r.total > 0) ||
        requiresDepth(graph, a.n.node_id, input.instrument_id) -
          requiresDepth(graph, b.n.node_id, input.instrument_id),
    )
    .slice(0, MAX_START_SUGGESTIONS)
  for (const { n } of ready) opportunities.push({ kind: 'start', node_id: n.node_id })

  const areas: Area[] = []
  for (const n of practiceNodes) {
    const root = rootOf(byId, n.node_id)
    let area = areas.find((a) => a.node_id === root)
    if (!area) areas.push((area = { node_id: root, nodes: [] }))
    area.nodes.push({ node_id: n.node_id, ...snapshot(n.node_id, input.states_now) })
  }

  const weekAgo = now.getTime() - 7 * DAY_MS
  const days = new Set(
    input.evidence
      .filter((e) => {
        const t = Date.parse(e.occurred_at)
        return t > weekAgo && t <= now.getTime()
      })
      .map((e) => e.occurred_at.slice(0, 10)),
  )

  return {
    generated_at: now.toISOString(),
    practice_days_last_7: days.size,
    progress,
    opportunities,
    areas,
  }
}
