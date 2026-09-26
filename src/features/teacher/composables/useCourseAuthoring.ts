import { useApi } from '@/shared/composables/useApi'
import { useApiItem } from '@/shared/composables/useApiItem'
import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type Course = components['schemas']['Course']
type CourseDetail = components['schemas']['CourseDetail']
type CourseVersion = components['schemas']['CourseVersion']
type CreateCourseRequest = components['schemas']['CreateCourseRequest']
type ReplaceCourseRequest = components['schemas']['ReplaceCourseRequest']

/** A course's live draft, as its author or an admin edits it. */
export function useCourse(courseId: string) {
  const { item: course, isLoading, error, notFound, retry } = useApiItem<Course>((coreApi) =>
    coreApi.GET('/courses/{course_id}', { params: { path: { course_id: courseId } } }),
  )

  return { course, isLoading, error, notFound, retry }
}

/** A course's latest published version, as learners see it. */
export function usePublishedCourse(courseId: string) {
  const { item: outline, isLoading, error, retry } = useApiItem<CourseDetail>((coreApi) =>
    coreApi.GET('/courses/{course_id}/published', { params: { path: { course_id: courseId } } }),
  )

  return { outline, isLoading, error, retry }
}

export function useCourseMutations() {
  const createCourse = useApiMutation<[CreateCourseRequest], Course>(
    (coreApi, request) => coreApi.POST('/courses', { body: request }),
    'Failed to create the course',
  )
  const replaceCourse = useApiMutation<[string, ReplaceCourseRequest], Course>(
    (coreApi, courseId, request) =>
      coreApi.PUT('/courses/{course_id}', { params: { path: { course_id: courseId } }, body: request }),
    'Failed to save the course',
  )
  const publishCourse = useApiMutation<[string], CourseVersion>(
    (coreApi, courseId) => coreApi.POST('/courses/{course_id}/publish', { params: { path: { course_id: courseId } } }),
    'Failed to publish the course',
  )
  const retireCourse = useApiMutation<[string], Course>(
    (coreApi, courseId) => coreApi.POST('/courses/{course_id}/retire', { params: { path: { course_id: courseId } } }),
    'Failed to retire the course',
  )
  const reactivateCourse = useApiMutation<[string], Course>(
    (coreApi, courseId) =>
      coreApi.POST('/courses/{course_id}/reactivate', { params: { path: { course_id: courseId } } }),
    'Failed to reactivate the course',
  )

  return { createCourse, replaceCourse, publishCourse, retireCourse, reactivateCourse }
}

/**
 * Looks up learning paths' own titles, which a course only carries for
 * checkpoints without a title override. Each title is looked up once; a
 * path that fails to load is tried again on the next lookUp.
 */
export function useLearningPathTitles(onFound: (learningPathId: string, title: string) => void) {
  const { coreApi } = useApi()
  const requested = new Set<string>()

  async function lookUp(learningPathIds: string[]) {
    const pending = learningPathIds.filter((id) => !requested.has(id))
    pending.forEach((id) => requested.add(id))
    await Promise.all(
      pending.map(async (learningPathId) => {
        const { data } = await coreApi.GET('/learning-paths/{learning_path_id}', {
          params: { path: { learning_path_id: learningPathId } },
        })
        if (data) {
          onFound(learningPathId, data.title)
        } else {
          requested.delete(learningPathId)
        }
      }),
    )
  }

  return { lookUp }
}
