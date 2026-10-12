import { shallowRef } from 'vue'

import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']

/**
 * The current path as last changed by the student here — a switch, an Undo, a leave — so every
 * screen that shows it follows at once, even one that is already open. `null` once nothing is current.
 */
export const announcedCurrentPath = shallowRef<{ view: StudentPathView | null } | null>(null)

export function announceCurrentPath(view: StudentPathView | null) {
  // A fresh wrapper every time, so announcing the same path twice still reaches every watcher.
  announcedCurrentPath.value = { view }
}
