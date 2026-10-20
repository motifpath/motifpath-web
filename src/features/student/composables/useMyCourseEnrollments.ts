import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type CourseEnrollment = components['schemas']['CourseEnrollment']

export function useMyCourseEnrollments() {
  const {
    items: enrollments,
    isLoading,
    error,
    retry,
  } = useApiList<CourseEnrollment>((coreApi) => coreApi.GET('/students/me/course-enrollments', {}))

  return { enrollments, isLoading, error, retry }
}
