import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']

/** Exactly one of the two: the course enrollment or the standalone path to make current. */
export type CurrentPathTarget = { courseEnrollmentId: string } | { studentPathId: string }

export function useSetCurrentPath() {
  const setCurrentPath = useApiMutation<[CurrentPathTarget], StudentPathView>(
    (coreApi, target) =>
      coreApi.PUT('/students/me/current-path', {
        body:
          'courseEnrollmentId' in target
            ? { course_enrollment_id: target.courseEnrollmentId }
            : { student_path_id: target.studentPathId },
      }),
    'Failed to switch your current course or path',
  )

  return { setCurrentPath }
}
