import { completedCourseEnrollmentId } from '@/features/student/utils/courseCompletion'
import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

export type LessonCompletionOutcome =
  /** `view` is the path as re-read once the lesson was recorded; absent when no path is left. */
  | { kind: 'recorded'; view?: components['schemas']['StudentPathView'] }
  | { kind: 'course-completed'; enrollmentId: string }
  | { kind: 'timed-out' }

/**
 * A finished lesson is recorded asynchronously: the tracking event is accepted
 * at once, but the student's progress only reflects it once the event has been
 * processed, a moment later. Reading the current path straight away would
 * still show the lesson unfinished — and miss the one-time signal that it
 * completed the course. `waitForCompletion` re-reads the current path until
 * the lesson shows as completed (or the path moved on without it, or no path
 * is left), reporting a course completion if a re-read is the one that
 * discovers it, and gives up after a few attempts so a slow pipeline never
 * keeps the student waiting for long.
 */
export function useLessonCompletionSync({ intervalMs = 500, attempts = 10 } = {}) {
  const { coreApi } = useApi()

  async function waitForCompletion(contentNodeId: string): Promise<LessonCompletionOutcome> {
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, intervalMs))

      const result = await coreApi.GET('/students/me/path')
      if (result.response?.status === 404) return { kind: 'recorded' }
      if (!result.data) continue

      const enrollmentId = completedCourseEnrollmentId(result.data)
      if (enrollmentId) return { kind: 'course-completed', enrollmentId }

      const item = result.data.items.find((candidate) => candidate.content_node_id === contentNodeId)
      if (!item || item.status === 'completed') return { kind: 'recorded', view: result.data }
    }
    return { kind: 'timed-out' }
  }

  return { waitForCompletion }
}
