/**
 * Composes a practice session from knowledge states by plain rules — no model
 * call, so every pick can be explained ("why this item?").
 *
 * Away from the instrument: one mental block that fills the time, teacher
 * suggestions first, then roughly 60% due reviews, 25% weak items and 15% new
 * ones. Instrument in hand: a warm-up on something already known, a focus block
 * on what needs work, and — given time — applying the skill to music.
 */
import { INSTRUMENT_KINDS } from '@/spikes/practice/model'
import type {
  KnowledgeState,
  PracticeItem,
  Reason,
  Session,
  SessionBlock,
  SessionEntry,
  TaxonomyNode,
  TeacherNote,
} from '@/spikes/practice/model'
import { seededRandom, shuffled } from '@/spikes/practice/random'
import { descendantIds } from '@/spikes/practice/taxonomy'

export interface ComposeInput {
  session_id: string
  student_id: string
  now: Date
  items: PracticeItem[]
  states: Map<string, KnowledgeState>
  taxonomy: TaxonomyNode[]
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

function union(tree: TaxonomyNode[], ids: string[]): Set<string> {
  return new Set(ids.flatMap((id) => descendantIds(tree, id)))
}

export function composeSession(input: ComposeInput): Session {
  const { items, states, now } = input
  const pathSkills = union(input.taxonomy, input.path_skill_ids)
  const flaggedSkills = union(
    input.taxonomy,
    input.teacher_notes.flatMap((n) => n.needs_work.skill_ids),
  )
  const suggestedKeys = new Set(input.teacher_notes.flatMap((n) => n.suggested_item_keys))

  const isSuggested = (i: PracticeItem) =>
    suggestedKeys.has(i.item_key) || i.skill_ids.some((s) => flaggedSkills.has(s))
  const isEligible = (i: PracticeItem) => isSuggested(i) || i.skill_ids.some((s) => pathSkills.has(s))

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

  const blocks: SessionBlock[] = []
  const eligible = items.filter(isEligible)

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
    let total = 0
    for (;;) {
      const open = CATEGORIES.filter((c) => q[c].length > 0)
      if (open.length === 0) break
      const c = open.reduce((best, x) =>
        MIX[x] * (total + 1) - picked[x] > MIX[best] * (total + 1) - picked[best] ? x : best,
      )
      const item = q[c][0]!
      if (costSeconds(item) > budget) break
      q[c].shift()
      take(item, c)
      picked[c]++
      total++
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
        : (seenTechnique.sort((a, b) => states.get(b.item_key)!.fluency - states.get(a.item_key)!.fluency)[0] ??
          warmUpPool[0])
    if (warmUp) {
      blocks.push({ kind: 'warm_up', entries: [{ item_key: warmUp.item_key, reason: 'warm_up' }] })
      budget -= costSeconds(warmUp)
    }

    const application =
      input.minutes >= APPLICATION_MIN_MINUTES ? (repertoire.find(isSuggested) ?? repertoire[0]) : undefined
    if (application) budget -= costSeconds(application)

    const q = queues(pool.filter((i) => i !== warmUp && !repertoire.includes(i)))
    const ordered: [PracticeItem, Reason][] = [
      ...q.suggested.map((i): [PracticeItem, Reason] => [i, 'teacher_suggested']),
      ...CATEGORIES.flatMap((c) => q[c].map((i): [PracticeItem, Reason] => [i, c])),
    ]
    const focus: SessionEntry[] = []
    for (const [item, reason] of ordered) {
      if (focus.length >= MAX_FOCUS_ITEMS || costSeconds(item) > budget) break
      focus.push({ item_key: item.item_key, reason })
      budget -= costSeconds(item)
    }
    if (focus.length) blocks.push({ kind: 'focus', entries: focus })
    if (application) {
      blocks.push({ kind: 'application', entries: [{ item_key: application.item_key, reason: 'application' }] })
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
