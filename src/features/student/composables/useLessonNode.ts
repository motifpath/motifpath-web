import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { completedCourseEnrollmentId as completedEnrollmentOf } from '@/features/student/utils/courseCompletion'
import { buildMyPath, sectionAround, stepAfter, type MyPathSection, type MyPathStep } from '@/features/student/utils/myPath'
import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']
type ExpandedContent = components['schemas']['ExpandedContent']
type StudentPathItem = components['schemas']['StudentPathItem']

/**
 * What the lesson screen should show. `locked` waits on an earlier step;
 * `language-locked` has no version in the student's language and was opened
 * without choosing one it has. `no-media` is a step with nothing to show: a
 * video step with no video to play, or an article with no text (older
 * content).
 */
export type LessonNodeState =
  | 'loading'
  | 'error'
  | 'not-found'
  | 'locked'
  | 'language-locked'
  | 'no-media'
  | 'ready'

/**
 * Loads everything the lesson screen needs for one content node: the
 * student's progress on it (from their path), the node itself, its timed
 * cues and whether it has a challenge. Locked steps stop after the path
 * request, so nothing about a lesson the student may not open is fetched —
 * except a language-locked step opened in a `language` it has, which loads
 * like any other.
 *
 * The cues only decorate the lesson, so a failure to load them leaves the
 * lesson playable with none rather than blocking it; every other failure is
 * an error. Reloads whenever nodeId changes, since Vue Router reuses a
 * mounted component when only a param on the same route record changes.
 */
export function useLessonNode(
  nodeId: MaybeRefOrGetter<string>,
  options: { language?: MaybeRefOrGetter<string | undefined> } = {},
) {
  const { coreApi } = useApi()

  const state = ref<LessonNodeState>('loading')
  const status = ref<StudentPathItem['status'] | null>(null)
  const node = ref<ContentNode | null>(null)
  const cues = ref<ExpandedContent[]>([])
  const hasChallenge = ref(false)
  const completedCourseEnrollmentId = ref<string | null>(null)
  const pathTitle = ref<string | null>(null)
  // Where the step sits on the path: the step itself, the one after it (which its completion
  // opens), the one the student can do now, how many steps the path has, and the steps around it
  // in its section.
  const step = ref<MyPathStep | null>(null)
  const next = ref<MyPathStep | null>(null)
  const current = ref<MyPathStep | null>(null)
  const total = ref(0)
  const section = ref<MyPathSection | null>(null)

  // Bumped on every load() call; a call only applies its result if it is
  // still the most recent one by the time it resolves, so an overlapping
  // retry or node change cannot be overwritten by a slower, stale request.
  // The previous call's in-flight requests are aborted as well as ignored.
  let loadEpoch = 0
  let loadAbortController: AbortController | null = null

  function reset(): void {
    status.value = null
    node.value = null
    cues.value = []
    hasChallenge.value = false
    completedCourseEnrollmentId.value = null
    pathTitle.value = null
    step.value = null
    next.value = null
    current.value = null
    total.value = 0
    section.value = null
  }

  async function load(): Promise<void> {
    const myEpoch = ++loadEpoch
    loadAbortController?.abort()
    const abortController = new AbortController()
    loadAbortController = abortController
    const { signal } = abortController
    const id = toValue(nodeId)

    state.value = 'loading'
    reset()

    try {
      const pathResult = await coreApi.GET('/students/me/path', { signal })
      if (myEpoch !== loadEpoch) return
      if (pathResult.error || !pathResult.data) {
        state.value = pathResult.response?.status === 404 ? 'not-found' : 'error'
        return
      }
      completedCourseEnrollmentId.value = completedEnrollmentOf(pathResult.data)
      pathTitle.value = pathResult.data.title

      const item = pathResult.data.items.find((candidate) => candidate.content_node_id === id)
      if (!item) {
        state.value = 'not-found'
        return
      }
      status.value = item.status
      const steps = buildMyPath(pathResult.data).sections.flatMap((section) => section.steps)
      step.value = steps.find((candidate) => candidate.contentNodeId === id) ?? null
      next.value = stepAfter(pathResult.data, id)
      current.value = steps.find((candidate) => candidate.position === pathResult.data.current_position) ?? null
      total.value = steps.length
      section.value = sectionAround(pathResult.data, id)
      // A language-locked step opens once the student picks a language it has: the lock is about
      // the student's own language, not about the lesson being out of reach.
      const language = toValue(options.language)
      const openedInLanguage =
        item.lock_reason === 'language' &&
        language !== undefined &&
        (item.available_languages ?? []).some((available) => available.code === language)
      if (item.status === 'locked' && !openedInLanguage) {
        state.value = item.lock_reason === 'language' ? 'language-locked' : 'locked'
        return
      }

      const params = { params: { path: { content_node_id: id } }, signal }
      const [nodeResult, cuesResult, challengesResult] = await Promise.all([
        coreApi.GET('/content-nodes/{content_node_id}', params),
        coreApi.GET('/content-nodes/{content_node_id}/expanded-content', params),
        coreApi.GET('/content-nodes/{content_node_id}/challenges', params),
      ])
      if (myEpoch !== loadEpoch) return
      if (
        nodeResult.error ||
        !nodeResult.data ||
        challengesResult.error ||
        !challengesResult.data
      ) {
        state.value = 'error'
        return
      }

      node.value = nodeResult.data
      cues.value = cuesResult.data?.items ?? []
      hasChallenge.value = challengesResult.data.length > 0

      const hasContent =
        nodeResult.data.content_type === 'video'
          ? Boolean(nodeResult.data.media_url)
          : (nodeResult.data.rich_content?.content.length ?? 0) > 0
      state.value = hasContent ? 'ready' : 'no-media'
    } catch {
      // A superseded call's own requests were aborted above — nothing to do,
      // the newer call already owns state. Any other failure (network down)
      // is surfaced the same way as a resolved {error} would be.
      if (myEpoch !== loadEpoch) return
      state.value = 'error'
    }
  }

  watch(
    () => [toValue(nodeId), toValue(options.language)],
    () => void load(),
  )
  void load()

  return {
    state,
    status,
    node,
    cues,
    hasChallenge,
    completedCourseEnrollmentId,
    pathTitle,
    step,
    next,
    current,
    total,
    section,
    retry: load,
  }
}
