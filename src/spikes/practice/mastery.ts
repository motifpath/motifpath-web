/**
 * Knowledge state, derived at read time from an item's evidence. Nothing here
 * is stored: replaying the same evidence at the same moment gives the same state.
 *
 * Every piece of evidence is reduced to the same three things, whatever its
 * kind or source: did it count as a hit, a miss or neither; how much it says
 * about accuracy; and how close to the item's speed or tempo goal it was.
 */
import type { Evidence, KnowledgeState, Level, PracticeItem } from '@/spikes/practice/model'

const DAY_MS = 86_400_000

/** Wait before the next review, by spaced-repetition box. Box 0 is never seen. */
export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32]
const MAX_BOX = BOX_INTERVAL_DAYS.length - 1

/** A fretboard answer this fast or faster counts as fully fluent. */
export const FRETBOARD_FLUENT_MS = 2000

/** How strongly one piece of evidence pulls the weighted averages, by source. */
export const SOURCE_WEIGHT: Record<Evidence['source'], number> = {
  auto_graded: 0.3,
  self_assessed: 0.3,
  teacher_reviewed: 0.6,
}

const LEVEL_ORDER: Level[] = ['new', 'learning', 'accurate', 'fluent', 'retained']

type Outcome = 'hit' | 'miss' | 'hold'

interface Reading {
  outcome: Outcome
  accuracy: number
  fluency: number
}

function fluentMs(item: PracticeItem): number {
  return item.kind === 'exercise' ? item.estimated_seconds * 500 : FRETBOARD_FLUENT_MS
}

/** How far a take got toward the item's goal: tempo or changes per minute. */
function goalRatio(item: PracticeItem, bpm: number | null, cpm: number | null): number {
  if (item.kind === 'play_along' && bpm !== null) return Math.min(1, bpm / item.params.target_bpm)
  if (item.kind === 'chord_change' && cpm !== null) return Math.min(1, cpm / item.target_changes_per_minute)
  return 1
}

function read(item: PracticeItem, e: Evidence): Reading {
  if (e.source === 'auto_graded') {
    if (!e.correct) return { outcome: 'miss', accuracy: 0, fluency: 0 }
    return { outcome: 'hit', accuracy: 1, fluency: Math.min(1, fluentMs(item) / Math.max(1, e.latency_ms)) }
  }
  const ratio = goalRatio(item, e.bpm, e.changes_per_minute)
  if (e.rating === 'clean') return { outcome: 'hit', accuracy: 1, fluency: ratio }
  if (e.rating === 'almost') return { outcome: 'hold', accuracy: 0.5, fluency: ratio * 0.5 }
  return { outcome: 'miss', accuracy: 0, fluency: 0 }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function earnedLevel(attempts: number, accuracy: number, fluency: number, box: number): Level {
  if (attempts === 0) return 'new'
  if (attempts >= 5 && accuracy >= 0.9 && fluency >= 0.8) return box >= 5 ? 'retained' : 'fluent'
  if (attempts >= 3 && accuracy >= 0.8) return 'accurate'
  return 'learning'
}

function oneLower(level: Level): Level {
  const i = LEVEL_ORDER.indexOf(level)
  return i <= 1 ? level : LEVEL_ORDER[i - 1]!
}

export function deriveState(item: PracticeItem, evidence: Evidence[], now: Date): KnowledgeState {
  const ordered = [...evidence].sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at))
  let accuracy = 0
  let fluency = 0
  let box = 0
  let due: number | null = null
  let counted = 0
  // The best clean tempo (or change rate) claimed since the latest teacher review.
  let edge: number | null = null
  ordered.forEach((e) => {
    const t = Date.parse(e.occurred_at)
    const measure = e.source === 'auto_graded' ? null : (e.bpm ?? e.changes_per_minute)
    if (e.source === 'teacher_reviewed') edge = null
    // The tempo ladder pushes every session to the student's edge: a take that isn't clean
    // above the best clean tempo is exploring, not forgetting, so it doesn't count against them.
    const exploring =
      e.source === 'self_assessed' && e.rating !== 'clean' && measure !== null && edge !== null && measure > edge
    if (e.source !== 'auto_graded' && e.rating === 'clean' && measure !== null) edge = Math.max(edge ?? 0, measure)
    if (exploring) return
    const r = read(item, e)
    const w = SOURCE_WEIGHT[e.source]
    accuracy = counted === 0 ? r.accuracy : accuracy + w * (r.accuracy - accuracy)
    fluency = counted === 0 ? r.fluency : fluency + w * (r.fluency - fluency)
    counted++
    if (r.outcome === 'miss') box = 1
    else if (box === 0) box = 1
    else if (r.outcome === 'hit' && due !== null && t >= due) box = Math.min(MAX_BOX, box + 1)
    else return
    due = t + BOX_INTERVAL_DAYS[box]! * DAY_MS
  })

  const attempts = ordered.length
  const level = earnedLevel(attempts, accuracy, fluency, box)
  // Fading starts the moment a review is due; the shown level drops only once the
  // review is overdue by more than the item's own wait.
  const overdueMs = due === null ? -1 : now.getTime() - due
  const fading = overdueMs >= 0
  const lapsed = overdueMs > BOX_INTERVAL_DAYS[box]! * DAY_MS

  // A teacher review resets what the student claims: only takes since the latest review count.
  let lastReview = -1
  ordered.forEach((e, i) => {
    if (e.source === 'teacher_reviewed') lastReview = i
  })
  const sinceReview = ordered.slice(Math.max(0, lastReview))
  const cleanClaims = sinceReview.filter((e) => e.source !== 'auto_graded' && e.rating === 'clean')
  const best = (values: (number | null)[]) => {
    const present = values.filter((v): v is number => v !== null)
    return present.length ? Math.max(...present) : null
  }
  const latestReview = lastReview >= 0 ? ordered[lastReview] : undefined

  return {
    item_key: item.item_key,
    attempts,
    accuracy,
    fluency,
    box,
    last_seen_at: ordered.at(-1)?.occurred_at ?? null,
    due_at: due === null ? null : new Date(due).toISOString(),
    level,
    effective_level: lapsed ? oneLower(level) : level,
    fading,
    verified: latestReview?.source === 'teacher_reviewed' ? latestReview.verified : false,
    median_latency_ms: median(
      ordered
        .filter((e) => e.source === 'auto_graded' && e.correct)
        .slice(-10)
        .map((e) => (e.source === 'auto_graded' ? e.latency_ms : 0)),
    ),
    best_clean_bpm: best(cleanClaims.map((e) => (e.source === 'auto_graded' ? null : e.bpm))),
    best_changes_per_minute: best(cleanClaims.map((e) => (e.source === 'auto_graded' ? null : e.changes_per_minute))),
  }
}

export function deriveStates(items: PracticeItem[], evidence: Evidence[], now: Date): Map<string, KnowledgeState> {
  const byItem = new Map<string, Evidence[]>()
  for (const e of evidence) {
    const list = byItem.get(e.item_key)
    if (list) list.push(e)
    else byItem.set(e.item_key, [e])
  }
  return new Map(items.map((item) => [item.item_key, deriveState(item, byItem.get(item.item_key) ?? [], now)]))
}
