import type { components } from '@/api/generated/core-domain'
import type { LearningItem } from '@/features/student/utils/learning'
import { useApiMutation } from '@/shared/composables/useApiMutation'

type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']

/** The updated enrolment or path, to put in place of the row it came from. */
export interface UpdateResult {
  enrollment?: CourseEnrollment
  path?: StudentPath
}

/**
 * Takes the latest published version of a course or standalone path the student is following.
 * Finished lessons stay finished; which item is current does not change. It can't be undone.
 */
export function useUpdateLearningItem() {
  const updateEnrollment = useApiMutation<[string], CourseEnrollment>(
    (coreApi, id) =>
      coreApi.POST('/students/me/course-enrollments/{course_enrollment_id}/update', {
        params: { path: { course_enrollment_id: id } },
      }),
    'Failed to update the course',
  )
  const updatePath = useApiMutation<[string], StudentPath>(
    (coreApi, id) =>
      coreApi.POST('/students/me/paths/{student_path_id}/update', {
        params: { path: { student_path_id: id } },
      }),
    'Failed to update the path',
  )

  async function update(item: LearningItem): Promise<UpdateResult> {
    return 'courseEnrollmentId' in item.target
      ? { enrollment: await updateEnrollment(item.target.courseEnrollmentId) }
      : { path: await updatePath(item.target.studentPathId) }
  }

  return { update }
}
