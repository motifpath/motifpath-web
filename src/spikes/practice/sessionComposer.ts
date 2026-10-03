/**
 * Composes a practice session from knowledge states by plain rules — no model
 * call, so every pick can be explained ("why this item?").
 *
 * Away from the instrument: one mental block that fills the time, teacher
 * suggestions first, then roughly 60% due reviews, 25% weak items and 15% new
 * ones. Instrument in hand: a warm-up on something already known, a focus block
 * on what needs work, and — given time — applying the skill to music.
 *
 * A caught-up student still gets a full session: the time left is shared between
 * reviewing known items ahead of their due date and stretching into nodes whose
 * requirements they meet, each taking over the other's share when it runs out.
 */
import { INSTRUMENT_KINDS } from '@/spikes/practice/model'
import type {
  KnowledgeState,
  PracticeItem,
  Reason,
  Session,
  SessionBlock,
  SessionEntry,
  KnowledgeGraph,
  GraphNode,
  TeacherNote,
} from '@/spikes/practice/model'
import { seededRandom, shuffled } from '@/spikes/practice/random'
import { descendantIds, isForInstrument, readiness } from '@/spikes/practice/graph'
import { openSuggestions } from '@/spikes/practice/teacherNotes'

export interface ComposeInput {
  session_id: string
  student_id: string
  now: Date
  items: PracticeItem[]
  states: Map<string, KnowledgeState>
  graph: KnowledgeGraph
  /** The student's instrument: only nodes for it count. */
  instrument_id: string
  /** Skills met on the path; their subtrees are fair game. */
  path_skill_ids: string[]
  teacher_notes: TeacherNote[]
  instrument_in_hand: boolean
  minutes: number
  seed: number
}

export const MIX = { due: 0.6, weak: 0.25, new: 0.15 } as const
type Category = keyof typeof MIX
const CATEGORIES: Category[] = ['due', 'weak', 'new']

/** How a caught-up student's remaining time is shared. */
export const CAUGHT_UP_MIX = { review_ahead: 0.5, stretch: 0.5 } as const
type CaughtUp = keyof typeof CAUGHT_UP_MIX
const CAUGHT_UP: CaughtUp[] = ['review_ahead', 'stretch']

/** Stretch picks easier ground first, by the map's calibration annotation. */
const MAP_LEVEL_RANK = { B: 0, EI: 1, I: 2, A: 3 } as const

/**
 * The next pick from a set of queues so that picks track the target shares;
 * ties go to the earlier category. Null when every queue is empty.
 */
function nextCategory<C extends string>(
  mix: Record<C, number>,
  order: C[],
  queues: Record<C, unknown[]>,
  picked: Record<C, number>,
): C | null {
  const open = order.filter((c) => queues[c].length > 0)
  if (open.length === 0) return null
  const total = order.reduce((n, c) => n + picked[c], 0)
  return open.reduce((best, x) =>
    mix[x] * (total + 1) - picked[x] > mix[best] * (total + 1) - picked[best] ? x : best,
  )
}

const MAX_FOCUS_ITEMS = 3
const APPLICATION_MIN_MINUTES = 10
/** Shorter sessions skip the warm-up: it would take the whole time. */
const WARM_UP_MIN_MINUTES = 5

export function costSeconds(item: PracticeItem): number {
  switch (item.kind) {
    case 'fretboard_cell':
      return 10
    case 'exercise':
      return item.estimated_seconds
    case 'play_along':
      return 120
    case 'chord_change':
      return 90
  }
}

function union(tree: GraphNode[], ids: string[]): Set<string> {
  return new Set(ids.flatMap((id) => descendantIds(tree, id)))
}

export function composeSession(input: ComposeInput): Session {
  const { items, states, now } = input
  const { graph } = input
  const pathSkills = union(graph.nodes, input.path_skill_ids)
  const open = openSuggestions(input.teacher_notes, { nodes: graph.nodes, items, states, now })
  const flaggedNodes = union(graph.nodes, open.node_ids)
  const suggestedKeys = new Set(open.item_keys)

  const isSuggested = (i: PracticeItem) =>
    suggestedKeys.has(i.item_key) ||
    [...i.skill_ids, ...i.concept_ids].some((s) => flaggedNodes.has(s))
  const isEligible = (i: PracticeItem) =>
    isSuggested(i) || i.skill_ids.some((s) => pathSkills.has(s))
  const isSeen = (i: PracticeItem) => (states.get(i.item_key)?.attempts ?? 0) > 0

  const categoryOf = (i: PracticeItem): Category | null => {
    const s = states.get(i.item_key)
    if (!s || s.attempts === 0) return 'new'
    if (s.due_at !== null && Date.parse(s.due_at) <= now.getTime()) return 'due'
    if (s.level === 'learning' || s.level === 'accurate' || s.fading) return 'weak'
    return null
  }

  /** Suggested first, then due (most overdue first), weak (weakest first), new (catalog order). */
  const queues = (pool: PracticeItem[]) => {
    const suggested = pool.filter(isSuggested)
    const rest = pool.filter((i) => !isSuggested(i))
    const by = (c: Category) => rest.filter((i) => categoryOf(i) === c)
    const state = (i: PracticeItem) => states.get(i.item_key)
    return {
      suggested,
      due: by('due').sort((a, b) => Date.parse(state(a)!.due_at!) - Date.parse(state(b)!.due_at!)),
      weak: by('weak').sort(
        (a, b) => state(a)!.accuracy + state(a)!.fluency - (state(b)!.accuracy + state(b)!.fluency),
      ),
      new: by('new'),
    }
  }

  /** Known, secure items not yet due, soonest due first. */
  const reviewAhead = (pool: PracticeItem[]) =>
    pool
      .filter((i) => isSeen(i) && categoryOf(i) === null)
      .sort(
        (a, b) =>
          Date.parse(states.get(a.item_key)!.due_at ?? '') -
          Date.parse(states.get(b.item_key)!.due_at ?? ''),
      )

  const nodesById = new Map(graph.nodes.map((n) => [n.node_id, n]))
  const readinessOf = new Map<string, ReturnType<typeof readiness>>()
  const ready = (id: string) => {
    if (!readinessOf.has(id))
      readinessOf.set(id, readiness(graph, items, states, id, input.instrument_id))
    const r = readinessOf.get(id)!
    return r.met === r.total
  }
  /**
   * Unseen items off the path whose skills are all for the student's instrument
   * and ready. Nodes that build on something the student meets come first, then
   * easier ground by the map's calibration, then catalog order.
   */
  const stretch = (pool: PracticeItem[]) =>
    pool
      .filter(
        (i) =>
          !isEligible(i) &&
          !isSeen(i) &&
          i.skill_ids.length > 0 &&
          i.skill_ids.every(
            (id) => isForInstrument(nodesById.get(id), input.instrument_id) && ready(id),
          ),
      )
      .map((item, order) => {
        const node = nodesById.get(item.skill_ids[0]!)!
        const buildsOn = readinessOf.get(node.node_id)!.total > 0 ? 0 : 1
        const ease = node.map_level === null ? 4 : MAP_LEVEL_RANK[node.map_level]
        return { item, node_id: node.node_id, rank: [buildsOn, ease, order] }
      })
      .sort((a, b) => a.rank[0]! - b.rank[0]! || a.rank[1]! - b.rank[1]! || a.rank[2]! - b.rank[2]!)

  const caughtUpQueues = (pool: PracticeItem[]): Record<CaughtUp, SessionEntry[]> => ({
    review_ahead: reviewAhead(pool).map((i) => ({ item_key: i.item_key, reason: 'review_ahead' })),
    stretch: stretch(pool).map((c) => ({
      item_key: c.item.item_key,
      reason: 'stretch',
      node_id: c.node_id,
    })),
  })

  const blocks: SessionBlock[] = []
  const eligible = items.filter(isEligible)
  const itemOf = (key: string) => items.find((i) => i.item_key === key)!

  if (!input.instrument_in_hand) {
    const pool = eligible.filter((i) => !INSTRUMENT_KINDS.includes(i.kind))
    const q = queues(pool)
    let budget = input.minutes * 60
    const entries: SessionEntry[] = []
    const take = (item: PracticeItem, reason: Reason) => {
      entries.push({ item_key: item.item_key, reason })
      budget -= costSeconds(item)
    }
    for (const item of q.suggested) {
      if (costSeconds(item) > budget) break
      take(item, 'teacher_suggested')
    }
    const picked: Record<Category, number> = { due: 0, weak: 0, new: 0 }
    let full = false
    for (
      let c = nextCategory(MIX, CATEGORIES, q, picked);
      c;
      c = nextCategory(MIX, CATEGORIES, q, picked)
    ) {
      const item = q[c][0]!
      if (costSeconds(item) > budget) {
        full = true
        break
      }
      q[c].shift()
      take(item, c)
      picked[c]++
    }
    if (!full) {
      const taken = new Set(entries.map((e) => e.item_key))
      const offPath = items.filter((i) => !isEligible(i) && !INSTRUMENT_KINDS.includes(i.kind))
      const cq = caughtUpQueues([...pool.filter((i) => !taken.has(i.item_key)), ...offPath])
      const done: Record<CaughtUp, number> = { review_ahead: 0, stretch: 0 }
      for (
        let c = nextCategory(CAUGHT_UP_MIX, CAUGHT_UP, cq, done);
        c;
        c = nextCategory(CAUGHT_UP_MIX, CAUGHT_UP, cq, done)
      ) {
        const entry = cq[c][0]!
        if (costSeconds(itemOf(entry.item_key)) > budget) break
        cq[c].shift()
        entries.push(entry)
        budget -= costSeconds(itemOf(entry.item_key))
        done[c]++
      }
    }
    blocks.push({ kind: 'mental', entries: shuffled(entries, seededRandom(input.seed)) })
  } else {
    const pool = eligible.filter((i) => INSTRUMENT_KINDS.includes(i.kind))
    const technique = pool.filter((i) => i.kind === 'play_along' && i.purpose === 'technique')
    const repertoire = pool.filter((i) => i.kind === 'play_along' && i.purpose === 'repertoire')
    let budget = input.minutes * 60

    // A warm-up is something easy: never what the teacher asked to work on.
    const warmUpPool = technique.filter((i) => !isSuggested(i))
    const seenTechnique = warmUpPool.filter((i) => (states.get(i.item_key)?.attempts ?? 0) > 0)
    const warmUp =
      input.minutes < WARM_UP_MIN_MINUTES
        ? undefined
        : (seenTechnique.sort(
            (a, b) => states.get(b.item_key)!.fluency - states.get(a.item_key)!.fluency,
          )[0] ?? warmUpPool[0])
    if (warmUp) {
      blocks.push({ kind: 'warm_up', entries: [{ item_key: warmUp.item_key, reason: 'warm_up' }] })
      budget -= costSeconds(warmUp)
    }

    const application =
      input.minutes >= APPLICATION_MIN_MINUTES
        ? (repertoire.find(isSuggested) ?? repertoire[0])
        : undefined
    if (application) budget -= costSeconds(application)

    const focusPool = pool.filter((i) => i !== warmUp && !repertoire.includes(i))
    const q = queues(focusPool)
    const ordered: SessionEntry[] = [
      ...q.suggested.map((i): SessionEntry => ({
        item_key: i.item_key,
        reason: 'teacher_suggested',
      })),
      ...CATEGORIES.flatMap((c) =>
        q[c].map((i): SessionEntry => ({ item_key: i.item_key, reason: c })),
      ),
    ]
    // Caught up: alternate reviewing ahead and stretching, after everything regular.
    const offPath = items.filter(
      (i) =>
        !isEligible(i) &&
        INSTRUMENT_KINDS.includes(i.kind) &&
        !(i.kind === 'play_along' && i.purpose === 'repertoire'),
    )
    const cq = caughtUpQueues([...focusPool, ...offPath])
    const done: Record<CaughtUp, number> = { review_ahead: 0, stretch: 0 }
    for (
      let c = nextCategory(CAUGHT_UP_MIX, CAUGHT_UP, cq, done);
      c;
      c = nextCategory(CAUGHT_UP_MIX, CAUGHT_UP, cq, done)
    ) {
      ordered.push(cq[c].shift()!)
      done[c]++
    }
    const focus: SessionEntry[] = []
    for (const entry of ordered) {
      const item = itemOf(entry.item_key)
      if (focus.length >= MAX_FOCUS_ITEMS || costSeconds(item) > budget) break
      focus.push(entry)
      budget -= costSeconds(item)
    }
    if (focus.length) blocks.push({ kind: 'focus', entries: focus })
    if (application) {
      blocks.push({
        kind: 'application',
        entries: [{ item_key: application.item_key, reason: 'application' }],
      })
    }
  }

  return {
    session_id: input.session_id,
    student_id: input.student_id,
    started_at: now.toISOString(),
    instrument_in_hand: input.instrument_in_hand,
    minutes: input.minutes,
    blocks,
  }
}
