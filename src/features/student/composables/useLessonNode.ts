import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']
type ExpandedContent = components['schemas']['ExpandedContent']
type StudentPathItem = components['schemas']['StudentPathItem']

/**
 * What the lesson screen should show. `unsupported` is a step whose content
 * type has no lesson screen yet; `no-media` is a video step that has no
 * video to play (older content).
 */
export type LessonNodeState =
  'loading' | 'error' | 'not-found' | 'locked' | 'unsupported' | 'no-media' | 'ready'

/**
 * Loads everything the lesson screen needs for one content node: the
 * student's progress on it (from their path), the node itself, its timed
 * cues and whether it has a challenge. Locked steps stop after the path
 * request, so nothing about a lesson the student may not open is fetched.
 *
 * The cues only decorate the lesson, so a failure to load them leaves the
 * lesson playable with none rather than blocking it; every other failure is
 * an error. Reloads whenever nodeId changes, since Vue Router reuses a
 * mounted component when only a param on the same route record changes.
 */
export function useLessonNode(nodeId: MaybeRefOrGetter<string>) {
  const { coreApi } = useApi()

  const state = ref<LessonNodeState>('loading')
  const status = ref<StudentPathItem['status'] | null>(null)
  const node = ref<ContentNode | null>(null)
  const cues = ref<ExpandedContent[]>([])
  const hasChallenge = ref(false)

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

      const item = pathResult.data.items.find((candidate) => candidate.content_node_id === id)
      if (!item) {
        state.value = 'not-found'
        return
      }
      status.value = item.status
      if (item.status === 'locked') {
        state.value = 'locked'
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

      if (nodeResult.data.content_type !== 'video') {
        state.value = 'unsupported'
      } else if (!nodeResult.data.media_url) {
        state.value = 'no-media'
      } else {
        state.value = 'ready'
      }
    } catch {
      // A superseded call's own requests were aborted above — nothing to do,
      // the newer call already owns state. Any other failure (network down)
      // is surfaced the same way as a resolved {error} would be.
      if (myEpoch !== loadEpoch) return
      state.value = 'error'
    }
  }

  watch(
    () => toValue(nodeId),
    () => void load(),
  )
  void load()

  return { state, status, node, cues, hasChallenge, retry: load }
}
