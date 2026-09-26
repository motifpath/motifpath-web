import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { isHttpUrl } from '@/shared/utils/httpUrl'

type CreateContentNodeRequest = components['schemas']['CreateContentNodeRequest']
type UpdateContentNodeRequest = components['schemas']['UpdateContentNodeRequest']
type ContentNode = components['schemas']['ContentNode']
type ContentType = CreateContentNodeRequest['content_type']
type DifficultyLevel = components['schemas']['ClassificationInput']['difficulty_level']
type ReviewState = components['schemas']['Classification']['review_state']
type PromptDocument = components['schemas']['PromptDocument']

const EMPTY_BODY: PromptDocument = { type: 'doc', content: [] }

/**
 * Holds authoring state for one content node (video or article) and maps it
 * to the Create/UpdateContentNodeRequest shapes the API expects. A video's
 * body is its media URL, an article's is its rich content; requests carry only
 * the one matching the content type, since the API rejects both together.
 * content_node-level language tagging has no authoring UI yet — every
 * content node is authored as language-agnostic, same as exercises.
 */
export function useContentNodeForm() {
  const title = ref('')
  const contentType = ref<ContentType>('video')
  const skillIds = ref<string[]>([])
  const conceptIds = ref<string[]>([])
  const difficultyLevel = ref<DifficultyLevel>('beginner')
  const reviewState = ref<ReviewState | null>(null)
  const mediaUrl = ref('')
  const richContent = ref<PromptDocument>(EMPTY_BODY)
  // Empty means the content suits every instrument.
  const instrumentIds = ref<string[]>([])
  const thumbnailUrl = ref<string | undefined>(undefined)

  const hasBody = computed(() =>
    contentType.value === 'video'
      ? isHttpUrl(mediaUrl.value.trim())
      : richContent.value.content.length > 0,
  )

  // Only a typed-but-unusable video URL counts as an error; an empty field is
  // just "not filled in yet" and shouldn't show one.
  const mediaUrlInvalid = computed(
    () =>
      contentType.value === 'video' &&
      mediaUrl.value.trim() !== '' &&
      !isHttpUrl(mediaUrl.value.trim()),
  )

  function body() {
    return contentType.value === 'video'
      ? { media_url: mediaUrl.value.trim() }
      : { rich_content: richContent.value }
  }

  function classification() {
    return {
      skill_ids: [...skillIds.value],
      concept_ids: [...conceptIds.value],
      difficulty_level: difficultyLevel.value,
    }
  }

  // A thumbnail left out of an update removes it, so none is sent once cleared.
  function metadata() {
    return {
      instrument_ids: [...instrumentIds.value],
      ...(thumbnailUrl.value ? { thumbnail_url: thumbnailUrl.value } : {}),
    }
  }

  function toCreateContentNodeRequest(): CreateContentNodeRequest {
    return {
      title: title.value,
      content_type: contentType.value,
      ...body(),
      classification: classification(),
      language_codes: ['any'],
      ...metadata(),
    }
  }

  function toUpdateContentNodeRequest(): UpdateContentNodeRequest {
    return {
      title: title.value,
      ...body(),
      classification: classification(),
      language_codes: ['any'],
      ...metadata(),
    }
  }

  function loadFromContentNode(contentNode: ContentNode) {
    title.value = contentNode.title
    contentType.value = contentNode.content_type
    skillIds.value = contentNode.classification.skills.map((s) => s.skill_id)
    conceptIds.value = contentNode.classification.concepts.map((c) => c.concept_id)
    difficultyLevel.value = contentNode.classification.difficulty_level
    reviewState.value = contentNode.classification.review_state
    mediaUrl.value = contentNode.media_url ?? ''
    richContent.value = contentNode.rich_content ?? EMPTY_BODY
    instrumentIds.value = [...contentNode.instrument_ids]
    thumbnailUrl.value = contentNode.thumbnail_url
  }

  return {
    title,
    contentType,
    skillIds,
    conceptIds,
    difficultyLevel,
    reviewState,
    mediaUrl,
    richContent,
    instrumentIds,
    thumbnailUrl,
    hasBody,
    mediaUrlInvalid,
    toCreateContentNodeRequest,
    toUpdateContentNodeRequest,
    loadFromContentNode,
  }
}
