import type { components } from '@/api/generated/core-domain'
import type { ItemOutcome } from '@/features/student/composables/usePracticeSessionRun'

type Item = components['schemas']['PracticeSessionItem']
/** What of a composed plan says which subjects it practises and which items are whose. */
type Plan = Pick<components['schemas']['PracticeSessionPlan'], 'focus_source' | 'focus_nodes' | 'items'>
type FocusNode = components['schemas']['PracticeFocusNode']
type Rung = components['schemas']['PracticeRung']

/** The practice ladder, lowest rung first: rungs are always listed in this order. */
export const RUNG_ORDER: readonly Rung[] = ['know', 'hear', 'play_clean', 'play_in_time', 'move', 'target', 'use']

/** A subject of the session, with the rungs its new items come from. */
export interface PlanSubject {
  node: FocusNode
  rungs: Rung[]
}

/** A group of today's plan, by where its items sit in the plan. */
export interface PlanSection {
  /** warm_up: the warm-up; review: due items of other subjects; subjects: the session's own subjects. */
  kind: 'warm_up' | 'review' | 'subjects'
  positions: number[]
}

/** How the answered items of a subject, or of the review block, went. */
export interface SubjectScore {
  right: number
  answered: number
}

export interface SubjectResult extends SubjectScore {
  node: FocusNode
  /** The rungs the answered items practised, lowest first. */
  rungs: Rung[]
}

function inLadderOrder(rungs: Iterable<Rung>): Rung[] {
  const set = new Set(rungs)
  return RUNG_ORDER.filter((rung) => set.has(rung))
}

/**
 * The subject an item practises: in a session the student chose, every item is of its one subject
 * (the node or a node part of it); otherwise the focus node the item is on, or none.
 */
function subjectOf(plan: Plan, item: Item): string | null {
  if (plan.focus_source === 'chosen') return plan.focus_nodes[0]?.node_id ?? null
  return plan.focus_nodes.some((node) => node.node_id === item.node_id) ? (item.node_id ?? null) : null
}

function isReview(plan: Plan, item: Item): boolean {
  return plan.focus_source !== 'chosen' && item.reason === 'due' && subjectOf(plan, item) === null
}

/**
 * The session's subjects, main first, each with the rungs its new items come from. A subject with
 * no new item this time shows the rungs of what it does hold.
 */
export function planSubjects(plan: Plan): PlanSubject[] {
  return plan.focus_nodes.map((node) => {
    const items = plan.items.filter((item) => item.reason !== 'warm_up' && subjectOf(plan, item) === node.node_id)
    const fresh = items.filter((item) => item.reason === 'new' || item.reason === 'stretch')
    return { node, rungs: inLadderOrder((fresh.length > 0 ? fresh : items).map((item) => item.rung)) }
  })
}

/**
 * Today's plan in its groups, in order: the warm-up, the review block of other subjects' due items,
 * then the session's subjects. A session the student chose has no review block. An empty group is
 * left out.
 */
export function planSections(plan: Plan): PlanSection[] {
  const sections: PlanSection[] = [
    { kind: 'warm_up', positions: [] },
    { kind: 'review', positions: [] },
    { kind: 'subjects', positions: [] },
  ]
  plan.items.forEach((item, position) => {
    const kind = item.reason === 'warm_up' ? 0 : isReview(plan, item) ? 1 : 2
    sections[kind].positions.push(position)
  })
  return sections.filter((section) => section.positions.length > 0)
}

/** Whether an answered or played item went right: an answer that was right, or a take, a rating or a minute that went clean. */
function wentRight(outcome: ItemOutcome): boolean {
  if (outcome.kind === 'answered') return outcome.correct
  if (outcome.kind === 'played') return outcome.takes.some((take) => take.rating === 'clean')
  return outcome.rating === 'clean'
}

function score(outcomes: ItemOutcome[]): SubjectScore {
  return { right: outcomes.filter(wentRight).length, answered: outcomes.length }
}

/** How each subject went on what the student answered of it, in the plan's subject order. A subject with nothing answered is left out. */
export function subjectResults(plan: Plan, outcomes: ReadonlyMap<number, ItemOutcome>): SubjectResult[] {
  return plan.focus_nodes.flatMap((node) => {
    const answered = plan.items.flatMap((item, position) => {
      const outcome = outcomes.get(position)
      return outcome !== undefined && item.reason !== 'warm_up' && subjectOf(plan, item) === node.node_id ? [{ item, outcome }] : []
    })
    if (answered.length === 0) return []
    return [{ node, ...score(answered.map(({ outcome }) => outcome)), rungs: inLadderOrder(answered.map(({ item }) => item.rung)) }]
  })
}

/** How the review block went on what the student answered of it; null when nothing of it was answered. */
export function reviewResult(plan: Plan, outcomes: ReadonlyMap<number, ItemOutcome>): SubjectScore | null {
  const answered = plan.items.flatMap((item, position) => {
    const outcome = outcomes.get(position)
    return outcome !== undefined && isReview(plan, item) ? [outcome] : []
  })
  return answered.length > 0 ? score(answered) : null
}
