import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type CourseEnrollment = components['schemas']['CourseEnrollment']

export type EnrollResult = { outcome: 'enrolled'; enrollment: CourseEnrollment } | { outcome: 'already-enrolled' }

export function useEnrollInCourse() {
  const { coreApi } = useApi()

  /**
   * Resolves `already-enrolled` instead of throwing when the student already
   * holds an active enrollment in this course — the goal (being enrolled) is
   * met, so callers should treat it like success rather than show an error.
   */
  async function enrollInCourse(courseId: string): Promise<EnrollResult> {
    const { data, error, response } = await coreApi.POST('/students/me/course-enrollments', {
      body: { course_id: courseId },
    })
    if (data) return { outcome: 'enrolled', enrollment: data }
    if (response?.status === 409) return { outcome: 'already-enrolled' }
    throw new Error(describeApiError(error, 'Failed to enroll in the course'))
  }

  return { enrollInCourse }
}
