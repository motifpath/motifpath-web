import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { useApi } from '@/shared/composables/useApi'

/**
 * The titles of a lesson and of the path it sits on, for screens that name
 * the lesson without loading it (the practice screen's "Send to your
 * teacher" message). Each title is null until it loads, and stays null if
 * its request fails — a missing title only leaves a line out of that
 * message, so a failure here is never surfaced as an error. Reloads whenever
 * nodeId changes.
 */
export function useLessonTitles(nodeId: MaybeRefOrGetter<string>) {
  const { coreApi } = useApi()

  const pathTitle = ref<string | null>(null)
  const lessonTitle = ref<string | null>(null)

  // Bumped on every load; only the latest load may write its titles.
  let loadEpoch = 0

  async function load(): Promise<void> {
    const myEpoch = ++loadEpoch
    pathTitle.value = null
    lessonTitle.value = null

    const [pathResult, nodeResult] = await Promise.allSettled([
      coreApi.GET('/students/me/path'),
      coreApi.GET('/content-nodes/{content_node_id}', {
        params: { path: { content_node_id: toValue(nodeId) } },
      }),
    ])
    if (myEpoch !== loadEpoch) return
    if (pathResult.status === 'fulfilled') pathTitle.value = pathResult.value.data?.title ?? null
    if (nodeResult.status === 'fulfilled') lessonTitle.value = nodeResult.value.data?.title ?? null
  }

  watch(
    () => toValue(nodeId),
    () => void load(),
  )
  void load()

  return { pathTitle, lessonTitle }
}
