import type { components } from '@/api/generated/core-domain'
import { announceCurrentPath } from '@/features/student/composables/currentPathAnnouncer'
import { useSetCurrentPath } from '@/features/student/composables/useSetCurrentPath'
import type { LearningItem } from '@/features/student/utils/learning'
import { useApiMutation } from '@/shared/composables/useApiMutation'

type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']
type StudentPathView = components['schemas']['StudentPathView']

/** What changed: the left enrolment or path, and the new current path when the left item was current. */
export interface LeaveResult {
  enrollment?: CourseEnrollment
  path?: StudentPath
  /** Present only when the current path changed; null when nothing is current any more. */
  current?: StudentPathView | null
}

/** The switch went through but the leave did not: the student is on `current`, the item still in progress. */
export class LeaveFailedAfterSwitchError extends Error {
  constructor(
    message: string,
    readonly current: StudentPathView,
  ) {
    super(message)
    this.name = 'LeaveFailedAfterSwitchError'
  }
}

export function useLeaveLearningItem() {
  const { setCurrentPath } = useSetCurrentPath()
  const abandon = useApiMutation<[string], CourseEnrollment>(
    (coreApi, id) =>
      coreApi.POST('/students/me/course-enrollments/{course_enrollment_id}/abandon', {
        params: { path: { course_enrollment_id: id } },
      }),
    'Failed to leave the course',
  )
  const archive = useApiMutation<[string], StudentPath>(
    (coreApi, id) =>
      coreApi.POST('/students/me/paths/{student_path_id}/archive', {
        params: { path: { student_path_id: id } },
      }),
    'Failed to remove the path',
  )

  async function leaveOnly(item: LearningItem): Promise<LeaveResult> {
    return 'courseEnrollmentId' in item.target
      ? { enrollment: await abandon(item.target.courseEnrollmentId) }
      : { path: await archive(item.target.studentPathId) }
  }

  /**
   * Leaves a course or removes a standalone path. The current item can't be left while another is
   * in progress, so `next` becomes current first; with no `next`, nothing is current afterwards.
   */
  async function leave(item: LearningItem, next: LearningItem | null): Promise<LeaveResult> {
    if (item.state !== 'current') return leaveOnly(item)
    if (!next) {
      const left = await leaveOnly(item)
      announceCurrentPath(null)
      return { ...left, current: null }
    }

    const current = await setCurrentPath(next.target)
    try {
      return { ...(await leaveOnly(item)), current }
    } catch (e) {
      throw new LeaveFailedAfterSwitchError(e instanceof Error ? e.message : String(e), current)
    }
  }

  return { leave }
}
