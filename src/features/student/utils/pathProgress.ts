import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']

/** `{ completed, total }` — how many steps are finished, out of how many. */
export function pathProgress(view: StudentPathView): { completed: number; total: number } {
  return {
    completed: view.items.filter((item) => item.status === 'completed').length,
    total: view.items.length,
  }
}
