import type { components } from '@/api/generated/core-domain'

type FocusNode = components['schemas']['PracticeFocusNode']
type Progress = components['schemas']['PracticeSubjectProgress']
type Rung = components['schemas']['PracticeRung']
type Level = components['schemas']['KnowledgeLevel']

/**
 * Where the student stands on a session's subjects after it, for its summary: still being read
 * while the session's answers are folded in, read, or unknown when it never caught up.
 */
export type SubjectLevels = { state: 'unknown' } | { state: 'pending' } | { state: 'read'; subjects: Progress[] }

/** How a session moved a subject on the rung it practised. */
export interface LevelChange {
  rung: Rung
  before: Level
  after: Level
  /** The subject's current rung now, once the rung practised reached accurate from below; otherwise null. */
  next: Rung | null
}

const LEVEL_ORDER: readonly Level[] = ['new', 'learning', 'accurate', 'fluent', 'retained']

function reached(level: Level): boolean {
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf('accurate')
}

/**
 * The level change on the rung the plan had the subject at, from its level then to its level on
 * that rung now. Null when the subject, or that rung of it, wasn't read.
 */
export function levelChange(node: FocusNode, progress: Progress | undefined): LevelChange | null {
  const after = progress?.rungs.find((rung) => rung.rung === node.rung)?.level
  if (progress === undefined || after === undefined) return null
  const next = reached(after) && !reached(node.rung_level) && progress.current_rung !== node.rung ? progress.current_rung : null
  return { rung: node.rung, before: node.rung_level, after, next }
}
