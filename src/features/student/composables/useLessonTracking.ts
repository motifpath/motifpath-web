import { getCurrentScope, onScopeDispose, watch, type Ref } from 'vue'

import type { LessonNodeState } from '@/features/student/composables/useLessonNode'
import { useEventTracking } from '@/shared/composables/useEventTracking'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']
type PathStatus = components['schemas']['StudentPathItem']['status']

/** The slice of `useLessonNode` this composable reads. */
interface LessonTrackingSource {
  state: Ref<LessonNodeState>
  node: Ref<ContentNode | null>
  status: Ref<PathStatus | null>
}

// Nodes whose started/resumed event has already been sent, held for the
// page's lifetime like the session id — matches the event schema's
// definition of a session, so leaving a lesson and reopening it in the same
// session does not report a second start.
const enteredNodeIds = new Set<string>()

/**
 * Sends the lesson-family tracking events for the lesson on screen.
 *
 * Once the lesson is ready it reports lesson.started for a step the student
 * has not begun, or lesson.resumed for one in progress, at most once per node
 * per session. Reopening a completed step reports nothing — completion is
 * final, so there is no progress left to record.
 *
 * `complete` reports lesson.completed when the student explicitly finishes
 * the lesson, with the whole seconds spent since the lesson became ready. The
 * duration is left out if the tab was hidden at any point, because the time
 * away cannot be told apart from time watching. It sends at most once per
 * lesson opening, and nothing for a lesson that was already completed.
 */
export function useLessonTracking(lesson: LessonTrackingSource) {
  const { track } = useEventTracking()

  let openedAtMs: number | null = null
  let hiddenSinceOpen = false
  let completedSent = false

  function onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') hiddenSinceOpen = true
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (getCurrentScope()) {
    onScopeDispose(() => document.removeEventListener('visibilitychange', onVisibilityChange))
  }

  function contentContext(node: ContentNode) {
    return {
      content_node_id: node.content_node_id,
      content_type: node.content_type,
      teacher_id: node.teacher.user_id,
    }
  }

  function open(node: ContentNode): void {
    openedAtMs = Date.now()
    hiddenSinceOpen = document.visibilityState === 'hidden'
    completedSent = false

    const status = lesson.status.value
    const eventType =
      status === 'not_started'
        ? 'lesson.started'
        : status === 'in_progress'
          ? 'lesson.resumed'
          : null
    if (eventType === null || enteredNodeIds.has(node.content_node_id)) return

    enteredNodeIds.add(node.content_node_id)
    void track({ event_type: eventType, content_context: contentContext(node) })
  }

  watch(
    () => lesson.state.value,
    (state) => {
      const node = lesson.node.value
      if (state === 'ready' && node) open(node)
    },
    { immediate: true },
  )

  async function complete(): Promise<void> {
    const node = lesson.node.value
    if (!node || openedAtMs === null || completedSent) return
    if (lesson.state.value !== 'ready' || lesson.status.value === 'completed') return

    completedSent = true
    const seconds = Math.round((Date.now() - openedAtMs) / 1000)
    await track({
      event_type: 'lesson.completed',
      content_context: contentContext(node),
      ...(hiddenSinceOpen ? {} : { duration_seconds: seconds }),
    })
  }

  return { complete }
}
