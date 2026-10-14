import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { useApi } from '@/shared/composables/useApi'

type CoreApi = ReturnType<typeof useApi>['coreApi']

/** The title of the student's current path. */
async function loadCurrentPathTitle(coreApi: CoreApi): Promise<string | null> {
  const { data } = await coreApi.GET('/students/me/path')
  return data?.title ?? null
}

/**
 * The name of the finished course or standalone path a reviewed lesson belongs to: the course's
 * title for a course part, or the path's own title. Null when it can't be read, never the current
 * path's title, so a reviewed lesson is never paired with a path it isn't on.
 */
async function loadReviewedOwnerTitle(coreApi: CoreApi, studentPathId: string): Promise<string | null> {
  const { data: view } = await coreApi.GET('/students/me/student-paths/{student_path_id}', {
    params: { path: { student_path_id: studentPathId } },
  })
  if (!view) return null
  const enrollmentId = view.course_enrollment_id
  if (!enrollmentId) return view.title

  const { data: enrollments } = await coreApi.GET('/students/me/course-enrollments')
  return enrollments?.find((enrollment) => enrollment.course_enrollment_id === enrollmentId)?.course_title ?? null
}

/**
 * The titles of a lesson and of the path it sits on, for screens that name
 * the lesson without loading it (the practice screen's "Send to your
 * teacher" message). Given a studentPathId, the lesson is being reviewed from
 * a finished course or path, and the path title names that course or path
 * rather than My path. Each title is null until it loads, and stays null if
 * its request fails — a missing title only leaves a line out of that
 * message, so a failure here is never surfaced as an error. Reloads whenever
 * either id changes.
 */
export function useLessonTitles(
  nodeId: MaybeRefOrGetter<string>,
  studentPathId?: MaybeRefOrGetter<string | undefined>,
) {
  const { coreApi } = useApi()

  const pathTitle = ref<string | null>(null)
  const lessonTitle = ref<string | null>(null)

  // Bumped on every load; only the latest load may write its titles.
  let loadEpoch = 0

  async function load(): Promise<void> {
    const myEpoch = ++loadEpoch
    pathTitle.value = null
    lessonTitle.value = null

    const reviewedPathId = toValue(studentPathId)
    const [pathResult, nodeResult] = await Promise.allSettled([
      reviewedPathId === undefined ? loadCurrentPathTitle(coreApi) : loadReviewedOwnerTitle(coreApi, reviewedPathId),
      coreApi.GET('/content-nodes/{content_node_id}', {
        params: { path: { content_node_id: toValue(nodeId) } },
      }),
    ])
    if (myEpoch !== loadEpoch) return
    if (pathResult.status === 'fulfilled') pathTitle.value = pathResult.value
    if (nodeResult.status === 'fulfilled') lessonTitle.value = nodeResult.value.data?.title ?? null
  }

  watch(
    () => [toValue(nodeId), toValue(studentPathId)],
    () => void load(),
  )
  void load()

  return { pathTitle, lessonTitle }
}
