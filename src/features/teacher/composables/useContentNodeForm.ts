import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type CreateContentNodeRequest = components['schemas']['CreateContentNodeRequest']
type UpdateContentNodeRequest = components['schemas']['UpdateContentNodeRequest']
type ContentNode = components['schemas']['ContentNode']
type ContentType = CreateContentNodeRequest['content_type']
type DifficultyLevel = components['schemas']['ClassificationInput']['difficulty_level']
type ReviewState = components['schemas']['Classification']['review_state']

/**
 * Holds authoring state for one content node (video or article) and maps it
 * to the Create/UpdateContentNodeRequest shapes the API expects.
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

  function classification() {
    return {
      skill_ids: [...skillIds.value],
      concept_ids: [...conceptIds.value],
      difficulty_level: difficultyLevel.value,
    }
  }

  function toCreateContentNodeRequest(): CreateContentNodeRequest {
    return {
      title: title.value,
      content_type: contentType.value,
      classification: classification(),
      language_codes: ['any'],
    }
  }

  function toUpdateContentNodeRequest(): UpdateContentNodeRequest {
    return {
      title: title.value,
      classification: classification(),
      language_codes: ['any'],
    }
  }

  function loadFromContentNode(contentNode: ContentNode) {
    title.value = contentNode.title
    contentType.value = contentNode.content_type
    skillIds.value = contentNode.classification.skills.map((s) => s.skill_id)
    conceptIds.value = contentNode.classification.concepts.map((c) => c.concept_id)
    difficultyLevel.value = contentNode.classification.difficulty_level
    reviewState.value = contentNode.classification.review_state
  }

  return {
    title,
    contentType,
    skillIds,
    conceptIds,
    difficultyLevel,
    reviewState,
    toCreateContentNodeRequest,
    toUpdateContentNodeRequest,
    loadFromContentNode,
  }
}
