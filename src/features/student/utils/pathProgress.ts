import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']
type StudentPathItem = components['schemas']['StudentPathItem']

/** One path step, flattened for rendering. */
export interface PathStepView {
  position: number
  title: string
  status: StudentPathItem['status']
  contentNodeId: string
  /** True for the single step at `current_position` — the one to work on next. */
  isCurrent: boolean
}

/**
 * Flattens a `StudentPathView`'s items into per-step view data. `isCurrent` is
 * derived solely from `current_position` (the backend's single source of truth
 * for "what's next"), never by re-scanning per-item `status`.
 */
export function stepViews(view: StudentPathView): PathStepView[] {
  return view.items.map((item) => ({
    position: item.position,
    title: item.title,
    status: item.status,
    contentNodeId: item.content_node_id,
    isCurrent: item.position === view.current_position,
  }))
}

/** `{ completed, total }` — how many steps are finished, out of how many. */
export function pathProgress(view: StudentPathView): { completed: number; total: number } {
  return {
    completed: view.items.filter((item) => item.status === 'completed').length,
    total: view.items.length,
  }
}
