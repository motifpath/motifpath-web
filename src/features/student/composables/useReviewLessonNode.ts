import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { loadLessonContent } from '@/features/student/composables/lessonContent'
import type { LessonNodeState } from '@/features/student/composables/useLessonNode'
import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']
type ExpandedContent = components['schemas']['ExpandedContent']
type StudentPathView = components['schemas']['StudentPathView']
type StudentPathItem = components['schemas']['StudentPathItem']
type CoreApi = ReturnType<typeof useApi>['coreApi']

/** Where a lesson sits: its part of a course (null in a standalone path), and its place in it. */
export interface ReviewPlace {
  part: number | null
  lesson: number
  total: number
  kind: StudentPathItem['content_type']
}

/** The lesson after this one in the course or path, which may be in the next part. */
export interface ReviewNext {
  studentPathId: string
  contentNodeId: string
  title: string
  kind: StudentPathItem['content_type']
  place: ReviewPlace
}

/** The finished course or path the lesson belongs to: its name, and its detail to go back to. */
export interface ReviewOwner {
  title: string
  to: RouteLocationRaw
}

/** A course's parts, or a standalone path as its only part, with what the lesson belongs to. */
interface Holding {
  parts: StudentPathView[]
  owner: ReviewOwner
  finished: boolean
}

function placeOf(part: StudentPathView, item: StudentPathItem): ReviewPlace {
  return {
    part: part.course_checkpoint_position ?? null,
    lesson: part.items.indexOf(item) + 1,
    total: part.items.length,
    kind: item.content_type,
  }
}

/** The lesson after `contentNodeId` in `parts`, read in order, crossing into the next part. */
function lessonAfter(parts: StudentPathView[], studentPathId: string, contentNodeId: string): ReviewNext | null {
  const lessons = parts.flatMap((part) => part.items.map((item) => ({ part, item })))
  const index = lessons.findIndex(
    ({ part, item }) => part.student_path_id === studentPathId && item.content_node_id === contentNodeId,
  )
  const after = index === -1 ? undefined : lessons[index + 1]
  if (!after) return null
  return {
    studentPathId: after.part.student_path_id,
    contentNodeId: after.item.content_node_id,
    title: after.item.title,
    kind: after.item.content_type,
    place: placeOf(after.part, after.item),
  }
}

/**
 * The parts of the course `view` is a part of, or `view` alone for a standalone path, with what
 * it belongs to. Null when one of them fails to load.
 */
async function loadHolding(coreApi: CoreApi, view: StudentPathView, signal: AbortSignal): Promise<Holding | null> {
  const enrollmentId = view.course_enrollment_id
  if (!enrollmentId) {
    return {
      parts: [view],
      owner: { title: view.title, to: { name: 'learning-path', params: { learningPathId: view.source_template_id } } },
      finished: view.items.every((item) => item.status === 'completed'),
    }
  }

  const [partsResult, enrollmentsResult] = await Promise.all([
    coreApi.GET('/students/me/course-enrollments/{course_enrollment_id}/parts', {
      params: { path: { course_enrollment_id: enrollmentId } },
      signal,
    }),
    coreApi.GET('/students/me/course-enrollments', { signal }),
  ])
  const enrollment = enrollmentsResult.data?.find((candidate) => candidate.course_enrollment_id === enrollmentId)
  if (!partsResult.data || !enrollment) return null
  return {
    parts: partsResult.data,
    owner: { title: enrollment.course_title, to: { name: 'learning-course', params: { courseId: enrollment.course_id } } },
    finished: enrollment.status === 'completed',
  }
}

/**
 * Loads a lesson opened for review from a finished course or standalone path: the lesson itself,
 * its place in its part, the lesson after it (into the next part of a course) and the course or
 * path to go back to. Nothing is locked and nothing is read from My path, so opening it never
 * touches the current course or path. A lesson of a course or path not finished — or of a part the
 * student hasn't reached — opens later, from My path, so nothing about it is fetched. Reloads when
 * either id changes, as the route reuses the screen for the next lesson.
 */
export function useReviewLessonNode(studentPathId: MaybeRefOrGetter<string>, nodeId: MaybeRefOrGetter<string>) {
  const { coreApi } = useApi()

  const state = ref<LessonNodeState>('loading')
  const status = ref<StudentPathItem['status'] | null>(null)
  const node = ref<ContentNode | null>(null)
  const cues = ref<ExpandedContent[]>([])
  const hasChallenge = ref(false)
  const owner = ref<ReviewOwner | null>(null)
  const place = ref<ReviewPlace | null>(null)
  const next = ref<ReviewNext | null>(null)

  // Only the most recent load applies its result; an earlier one still in flight is aborted.
  let loadEpoch = 0
  let loadAbortController: AbortController | null = null

  function reset(): void {
    status.value = null
    node.value = null
    cues.value = []
    hasChallenge.value = false
    owner.value = null
    place.value = null
    next.value = null
  }

  async function load(): Promise<void> {
    const myEpoch = ++loadEpoch
    loadAbortController?.abort()
    const abortController = new AbortController()
    loadAbortController = abortController
    const { signal } = abortController
    const pathId = toValue(studentPathId)
    const id = toValue(nodeId)

    state.value = 'loading'
    reset()

    try {
      const pathResult = await coreApi.GET('/students/me/student-paths/{student_path_id}', {
        params: { path: { student_path_id: pathId } },
        signal,
      })
      if (myEpoch !== loadEpoch) return
      if (pathResult.error || !pathResult.data) {
        state.value = pathResult.response?.status === 404 ? 'opens-later' : 'error'
        return
      }
      const view = pathResult.data
      const item = view.items.find((candidate) => candidate.content_node_id === id)
      if (!item) {
        state.value = 'not-found'
        return
      }

      const holding = await loadHolding(coreApi, view, signal)
      if (myEpoch !== loadEpoch) return
      if (!holding) {
        state.value = 'error'
        return
      }
      if (!holding.finished) {
        state.value = 'opens-later'
        return
      }
      status.value = item.status
      owner.value = holding.owner
      place.value = placeOf(view, item)
      next.value = lessonAfter(holding.parts, view.student_path_id, id)

      const content = await loadLessonContent(coreApi, id, signal)
      if (myEpoch !== loadEpoch) return
      if (!content) {
        state.value = 'error'
        return
      }
      node.value = content.node
      cues.value = content.cues
      hasChallenge.value = content.hasChallenge
      state.value = content.hasMedia ? 'ready' : 'no-media'
    } catch {
      // A superseded call's requests were aborted above, and the newer call owns state.
      if (myEpoch !== loadEpoch) return
      state.value = 'error'
    }
  }

  watch(
    () => [toValue(studentPathId), toValue(nodeId)],
    () => void load(),
  )
  void load()

  return { state, status, node, cues, hasChallenge, owner, place, next, retry: load }
}
