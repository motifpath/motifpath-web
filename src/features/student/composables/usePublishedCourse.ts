import { useApiItem } from '@/shared/composables/useApiItem'
import type { components } from '@/api/generated/core-domain'

type CourseDetail = components['schemas']['CourseDetail']

/** The latest published course snapshot, as a prospective learner sees it. */
export function usePublishedCourse(courseId: string) {
  const { item: course, isLoading, error, notFound, retry } = useApiItem<CourseDetail>((coreApi) =>
    coreApi.GET('/courses/{course_id}/published', { params: { path: { course_id: courseId } } }),
  )

  return { course, isLoading, error, notFound, retry }
}
