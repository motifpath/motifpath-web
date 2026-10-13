import type { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']
type ExpandedContent = components['schemas']['ExpandedContent']
type CoreApi = ReturnType<typeof useApi>['coreApi']

/** What a lesson screen shows of one content node, once it has loaded. */
export interface LessonContent {
  node: ContentNode
  cues: ExpandedContent[]
  hasChallenge: boolean
  /** Whether there is anything to show: a video to play, or an article's text. */
  hasMedia: boolean
}

/**
 * Loads a content node, its timed cues and whether it has a challenge, for the lesson screen.
 * The cues only decorate the lesson, so a failure to load them leaves it with none rather than
 * failing it; the node or its challenges failing returns null.
 */
export async function loadLessonContent(
  coreApi: CoreApi,
  contentNodeId: string,
  signal: AbortSignal,
): Promise<LessonContent | null> {
  const params = { params: { path: { content_node_id: contentNodeId } }, signal }
  const [nodeResult, cuesResult, challengesResult] = await Promise.all([
    coreApi.GET('/content-nodes/{content_node_id}', params),
    coreApi.GET('/content-nodes/{content_node_id}/expanded-content', params),
    coreApi.GET('/content-nodes/{content_node_id}/challenges', params),
  ])
  if (nodeResult.error || !nodeResult.data || challengesResult.error || !challengesResult.data) return null

  const node = nodeResult.data
  return {
    node,
    cues: cuesResult.data?.items ?? [],
    hasChallenge: challengesResult.data.length > 0,
    hasMedia:
      node.content_type === 'video' ? Boolean(node.media_url) : (node.rich_content?.content.length ?? 0) > 0,
  }
}
