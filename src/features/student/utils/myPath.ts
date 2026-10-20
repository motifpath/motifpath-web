import type { components } from '@/api/generated/core-domain'
import { groupPathSections } from '@/features/student/utils/groupPathSections'
import { pathProgress } from '@/features/student/utils/pathProgress'

type StudentPathView = components['schemas']['StudentPathView']
type StudentPathItem = components['schemas']['StudentPathItem']

/**
 * How a step shows on My path. `current` is the next step; `open` is any other step the student
 * may open but that isn't next; `locked` waits on an earlier step; `language` has no version in
 * the student's language but can be opened in one it has.
 */
export type StepState = 'done' | 'current' | 'open' | 'locked' | 'language'

export interface MyPathStep {
  position: number
  title: string
  contentNodeId: string
  kind: StudentPathItem['content_type']
  state: StepState
  /** Language codes a `language` step can be opened in; empty for every other state. */
  availableLanguages: string[]
}

export interface MyPathSection {
  label: string | null
  done: number
  total: number
  /** Every step done: the section folds into one row. Never true for an unlabelled run. */
  finished: boolean
  steps: MyPathStep[]
}

export interface MyPath {
  /** The step at `current_position`, unless every step is done. */
  next: MyPathStep | null
  progress: { completed: number; total: number }
  sections: MyPathSection[]
  complete: boolean
}

function stateOf(item: StudentPathItem, currentPosition: number): StepState {
  if (item.status === 'completed') return 'done'
  if (item.status === 'locked') return item.lock_reason === 'language' ? 'language' : 'locked'
  return item.position === currentPosition ? 'current' : 'open'
}

function stepOf(item: StudentPathItem, currentPosition: number): MyPathStep {
  const state = stateOf(item, currentPosition)
  return {
    position: item.position,
    title: item.title,
    contentNodeId: item.content_node_id,
    kind: item.content_type,
    state,
    availableLanguages: state === 'language' ? (item.available_languages ?? []).map((language) => language.code) : [],
  }
}

/**
 * Everything My path shows, from the student's path. The next step comes from
 * `current_position` (the server's single answer to "what's next"), never from re-scanning the
 * statuses. A language-locked step there stays the next step: opening it in a language it has is
 * the way forward.
 */
export function buildMyPath(view: StudentPathView): MyPath {
  const sections = groupPathSections(view.items).map((section) => {
    const steps = section.items.map((item) => stepOf(item, view.current_position))
    const done = steps.filter((step) => step.state === 'done').length
    return { label: section.label, done, total: steps.length, finished: section.label !== null && done === steps.length, steps }
  })
  const steps = sections.flatMap((section) => section.steps)
  const next = steps.find((step) => step.position === view.current_position && step.state !== 'done') ?? null

  return {
    next,
    progress: pathProgress(view),
    sections,
    complete: steps.every((step) => step.state === 'done'),
  }
}

/**
 * The step after a step, as the path has it now: the one that step's completion opens. Null after
 * the last step, or when the step isn't on the path.
 */
export function stepAfter(view: StudentPathView, contentNodeId: string): MyPathStep | null {
  const item = view.items.find((candidate) => candidate.content_node_id === contentNodeId)
  const after = item && view.items.find((candidate) => candidate.position === item.position + 1)
  return after ? stepOf(after, view.current_position) : null
}
