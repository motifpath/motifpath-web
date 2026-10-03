/**
 * Draft data model for practice sessions — throwaway spike code, shaped like the
 * schemas a spec would later define. Everything a screen shows must be derivable
 * from these types; nothing display-only is stored.
 *
 * The model in one breath: a student practises **items**; every answer, rating or
 * review is one piece of **evidence** about an item, tagged with where it came
 * from; an item's **knowledge state** is derived from its evidence at read time;
 * a **session** is composed from those states by rules; a **teacher note** carries
 * a human review and feeds both evidence and the next sessions.
 */
import type { components } from '@/api/generated/core-domain'

// ── Knowledge graph (the node and edge shapes the API serves) ───────────────────

type ApiKnowledgeNode = components['schemas']['KnowledgeNode']
type ApiKnowledgeEdge = components['schemas']['KnowledgeEdge']

/** The levels a `requires` edge can ask for: a subset of `Level`. */
export type MasteryLevel = components['schemas']['MasteryLevel']

/**
 * A skill or concept. In the spike `node_id` equals `key` for readable fixtures;
 * the API's ids are UUIDs. `instrument_ids` empty means every instrument.
 */
export interface GraphNode
  extends Pick<ApiKnowledgeNode, 'node_id' | 'kind' | 'key' | 'parent_id' | 'instrument_ids'> {
  name: string
  /** The map's calibration annotation (authors only, not installed); ranks stretch picks. */
  map_level: 'B' | 'EI' | 'I' | 'A' | null
}

export type GraphEdge = Pick<ApiKnowledgeEdge, 'from_id' | 'to_id' | 'type' | 'level'>

export interface KnowledgeGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ── Items ──────────────────────────────────────────────────────────────────────

/**
 * The smallest unit whose knowledge we track. `item_key` is stable and readable,
 * so a generated item (which has no row anywhere) still has an identity that
 * evidence and events can point at.
 */
interface ItemBase {
  item_key: string
  label: string
  skill_ids: string[]
  concept_ids: string[]
}

/** One cell of the fretboard: "what note is here?" / "where is this note?". */
export interface FretboardCellItem extends ItemBase {
  kind: 'fretboard_cell'
  instrument_id: string
  string: number
  fret: number
  /** Sharp spelling, e.g. "C#". */
  note_name: string
}

/** An authored exercise (the existing option-selection exercise). */
export interface ExerciseItem extends ItemBase {
  kind: 'exercise'
  exercise_id: string
  estimated_seconds: number
}

/** How a diagram is practised along with: a tempo ladder from start to target. */
export interface PlayAlongParams {
  start_bpm: number
  target_bpm: number
  /** BPM added after enough clean takes, or removed after a struggle. */
  step_bpm: number
  /** Clean takes in a row needed before the tempo goes up. */
  cleans_to_advance: number
  /** Times the sequence loops per take. */
  loops: number
  count_in_beats: number
}

/** Play along with an animated diagram, guitar in hand. */
export interface PlayAlongItem extends ItemBase {
  kind: 'play_along'
  diagram_id: string
  /** `technique` warms up and drills; `repertoire` applies the skill to music. */
  purpose: 'technique' | 'repertoire'
  params: PlayAlongParams
}

/** Switch between two chords for a minute; the measure is changes per minute. */
export interface ChordChangeItem extends ItemBase {
  kind: 'chord_change'
  from_diagram_id: string
  to_diagram_id: string
  target_changes_per_minute: number
}

export type PracticeItem = FretboardCellItem | ExerciseItem | PlayAlongItem | ChordChangeItem
export type ItemKind = PracticeItem['kind']

/** Items needing the instrument in hand; the rest can be practised anywhere. */
export const INSTRUMENT_KINDS: readonly ItemKind[] = ['play_along', 'chord_change']

// ── Evidence ───────────────────────────────────────────────────────────────────

export type Rating = 'struggled' | 'almost' | 'clean'

interface EvidenceBase {
  evidence_id: string
  student_id: string
  item_key: string
  /** ISO-8601. */
  occurred_at: string
  session_id: string | null
}

/** The platform checked the answer itself. */
export interface AutoGradedEvidence extends EvidenceBase {
  source: 'auto_graded'
  correct: boolean
  latency_ms: number
}

/** The student judged their own take. */
export interface SelfAssessedEvidence extends EvidenceBase {
  source: 'self_assessed'
  rating: Rating
  /** Play-along: the tempo of the take. */
  bpm: number | null
  /** Chord change: changes counted in one minute. */
  changes_per_minute: number | null
}

/** A teacher judged a take (or a live performance). */
export interface TeacherReviewedEvidence extends EvidenceBase {
  source: 'teacher_reviewed'
  teacher_note_id: string
  rating: Rating
  bpm: number | null
  changes_per_minute: number | null
  /** The teacher vouches the item is mastered at this level. */
  verified: boolean
}

export type Evidence = AutoGradedEvidence | SelfAssessedEvidence | TeacherReviewedEvidence
export type EvidenceSource = Evidence['source']

// ── Knowledge state (derived, never stored) ─────────────────────────────────────

export type Level = 'new' | 'learning' | 'accurate' | 'fluent' | 'retained'

export interface KnowledgeState {
  item_key: string
  attempts: number
  /** Weighted recent success, 0..1. */
  accuracy: number
  /** Weighted recent speed or tempo against the item's goal, 0..1. */
  fluency: number
  /** Spaced-repetition box; a higher box waits longer before the next review. */
  box: number
  last_seen_at: string | null
  due_at: string | null
  /** The level the evidence earned. */
  level: Level
  /** The level shown now: one lower once the review is overdue by more than its wait. */
  effective_level: Level
  /** The review is due: memory is fading. */
  fading: boolean
  verified: boolean
  median_latency_ms: number | null
  best_clean_bpm: number | null
  best_changes_per_minute: number | null
}

// ── Teacher note ───────────────────────────────────────────────────────────────

export type RubricCriterion = 'timing' | 'clean_notes' | 'tension' | 'dynamics'

export interface TimestampedComment {
  at_seconds: number
  text: string
}

/**
 * A teacher's impressions, with or without a recorded take. The same shape holds
 * a video review and notes from a live lesson.
 */
export interface TeacherNote {
  teacher_note_id: string
  student_id: string
  teacher_id: string
  created_at: string
  /** The take being reviewed; null for a live-lesson note. */
  take_id: string | null
  /** The item performed, when the note judges one. */
  item_key: string | null
  rating: Rating | null
  bpm: number | null
  verified: boolean
  rubric: Partial<Record<RubricCriterion, 1 | 2 | 3 | 4 | 5>>
  comments: TimestampedComment[]
  summary: string
  needs_work: { skill_ids: string[]; concept_ids: string[] }
  /** Items the next sessions should bring up first. */
  suggested_item_keys: string[]
}

// ── Recorded take ──────────────────────────────────────────────────────────────

export interface RecordedTake {
  take_id: string
  student_id: string
  item_key: string
  recorded_at: string
  bpm: number | null
  duration_seconds: number
  /** Local object URL in the spike; a media URL in production. */
  media_url: string
  sent_for_review: boolean
}

// ── Session ────────────────────────────────────────────────────────────────────

export type BlockKind = 'warm_up' | 'focus' | 'application' | 'mental'

export type Reason = 'teacher_suggested' | 'due' | 'weak' | 'new' | 'warm_up' | 'application'

export interface SessionEntry {
  item_key: string
  reason: Reason
}

export interface SessionBlock {
  kind: BlockKind
  entries: SessionEntry[]
}

export interface Session {
  session_id: string
  student_id: string
  started_at: string
  instrument_in_hand: boolean
  minutes: number
  blocks: SessionBlock[]
}

// ── Answer event (what the client would send) ──────────────────────────────────

/**
 * The practice answer event the tracking pipeline would need: today's answer
 * event carries neither correctness, latency, nor any identity for a generated
 * item. Mirrors `Evidence` minus server-assigned ids.
 */
export type AnswerEventDraft =
  | Omit<AutoGradedEvidence, 'evidence_id'>
  | Omit<SelfAssessedEvidence, 'evidence_id'>
