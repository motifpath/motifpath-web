/** The parts of a learning path that its save and publish depend on. */
export interface PathDraft {
  summary: string
  language: string | null
  level: string | null
  items: { content_node_id: string; title: string }[]
}

/** What a learning path needs before it can be saved at all; a draft may otherwise be incomplete. */
export function missingToSavePath(path: PathDraft): ('level' | 'items')[] {
  const missing: ('level' | 'items')[] = []
  if (path.level === null) missing.push('level')
  if (path.items.length === 0) missing.push('items')
  return missing
}

export type PathPublishRequirement =
  | { kind: 'summary' }
  | { kind: 'language' }
  | { kind: 'level' }
  | { kind: 'unpublishedLesson'; title: string }

/** Which of a path's lessons are published, among those whose state is known. */
export interface LessonStates {
  published: ReadonlySet<string>
  known: ReadonlySet<string>
}

/**
 * What a learning path needs before it can be published: a summary, a language, a level, and
 * every lesson published, since learners copy each lesson's published version. A lesson whose
 * state isn't known is left to the server to judge.
 */
export function missingToPublishPath(path: PathDraft, lessons: LessonStates): PathPublishRequirement[] {
  const missing: PathPublishRequirement[] = []
  if (path.summary.trim() === '') missing.push({ kind: 'summary' })
  if (!path.language) missing.push({ kind: 'language' })
  if (path.level === null) missing.push({ kind: 'level' })
  for (const item of path.items) {
    if (lessons.known.has(item.content_node_id) && !lessons.published.has(item.content_node_id)) missing.push({ kind: 'unpublishedLesson', title: item.title })
  }
  return missing
}
