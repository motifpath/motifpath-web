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

/**
 * Everything the knowledge state needs from an item's evidence so far, folded
 * one piece at a time in time order. The state shown at a moment is a view over
 * this plus "now"; nothing in it depends on the clock.
 */
export interface FoldState {
  attempts: number
  /** Evidence that moved the averages (exploration takes don't). */
  counted: number
  accuracy: number
  fluency: number
  box: number
  /** Next review, epoch ms. */
  due: number | null
  /** The best clean tempo or change rate since the latest teacher review: takes above it explore. */
  edge: number | null
  /** The latest evidence folded, epoch ms: anything earlier arrives late. */
  last_at: number | null
  last_seen_at: string | null
  /** The latest teacher review's vouch. */
  verified: boolean
  best_clean_bpm: number | null
  best_changes_per_minute: number | null
  /** The last ten correct answer times. */
  recent_latencies: number[]
}

export const EMPTY_FOLD: FoldState = {
  attempts: 0,
  counted: 0,
  accuracy: 0,
  fluency: 0,
  box: 0,
  due: null,
  edge: null,
  last_at: null,
  last_seen_at: null,
  verified: false,
  best_clean_bpm: null,
  best_changes_per_minute: null,
  recent_latencies: [],
}

const RECENT_LATENCIES = 10
const maxOf = (a: number | null, b: number | null) => (b === null ? a : a === null ? b : Math.max(a, b))

export function foldStep(item: PracticeItem, prev: FoldState, e: Evidence): FoldState {
  const t = Date.parse(e.occurred_at)
  const f: FoldState = { ...prev, attempts: prev.attempts + 1, last_at: t, last_seen_at: e.occurred_at }

  if (e.source === 'auto_graded') {
    if (e.correct) f.recent_latencies = [...prev.recent_latencies, e.latency_ms].slice(-RECENT_LATENCIES)
  } else {
    const clean = e.rating === 'clean'
    // A teacher review resets what the student claims: only takes since the latest review count.
    if (e.source === 'teacher_reviewed') {
      f.verified = e.verified
      f.edge = null
      f.best_clean_bpm = null
      f.best_changes_per_minute = null
    }
    const measure = e.bpm ?? e.changes_per_minute
    // The tempo ladder pushes every session to the student's edge: a take that isn't clean
    // above the best clean tempo is exploring, not forgetting, so it doesn't count against them.
    const exploring = e.source === 'self_assessed' && !clean && measure !== null && f.edge !== null && measure > f.edge
    if (clean) {
      if (measure !== null) f.edge = Math.max(f.edge ?? 0, measure)
      f.best_clean_bpm = maxOf(f.best_clean_bpm, e.bpm)
      f.best_changes_per_minute = maxOf(f.best_changes_per_minute, e.changes_per_minute)
    }
    if (exploring) return f
  }

  const r = read(item, e)
  const w = SOURCE_WEIGHT[e.source]
  f.accuracy = f.counted === 0 ? r.accuracy : f.accuracy + w * (r.accuracy - f.accuracy)
  f.fluency = f.counted === 0 ? r.fluency : f.fluency + w * (r.fluency - f.fluency)
  f.counted++
  if (r.outcome === 'miss') f.box = 1
  else if (f.box === 0) f.box = 1
  else if (r.outcome === 'hit' && f.due !== null && t >= f.due) f.box = Math.min(MAX_BOX, f.box + 1)
  else return f
  f.due = t + BOX_INTERVAL_DAYS[f.box]! * DAY_MS
  return f
}

/** The knowledge state an item shows at `now`, from its folded evidence. */
export function viewState(item: PracticeItem, f: FoldState, now: Date): KnowledgeState {
  const level = earnedLevel(f.attempts, f.accuracy, f.fluency, f.box)
  // Fading starts the moment a review is due; the shown level drops only once the
  // review is overdue by more than the item's own wait.
  const overdueMs = f.due === null ? -1 : now.getTime() - f.due
  const lapsed = overdueMs > BOX_INTERVAL_DAYS[f.box]! * DAY_MS
  return {
    item_key: item.item_key,
    attempts: f.attempts,
    accuracy: f.accuracy,
    fluency: f.fluency,
    box: f.box,
    last_seen_at: f.last_seen_at,
    due_at: f.due === null ? null : new Date(f.due).toISOString(),
    level,
    effective_level: lapsed ? oneLower(level) : level,
    fading: overdueMs >= 0,
    verified: f.verified,
    median_latency_ms: median(f.recent_latencies),
    best_clean_bpm: f.best_clean_bpm,
    best_changes_per_minute: f.best_changes_per_minute,
  }
}

export function deriveState(item: PracticeItem, evidence: Evidence[], now: Date): KnowledgeState {
  const ordered = [...evidence].sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at))
  return viewState(item, ordered.reduce((f, e) => foldStep(item, f, e), EMPTY_FOLD), now)
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
