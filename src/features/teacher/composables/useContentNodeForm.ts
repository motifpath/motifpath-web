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
  const skill = ref('')
  const concept = ref('')
  const difficultyLevel = ref<DifficultyLevel>('beginner')
  const reviewState = ref<ReviewState | null>(null)

  function classification() {
    return {
      skill: skill.value,
      concept: concept.value,
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
    skill.value = contentNode.classification.skill
    concept.value = contentNode.classification.concept
    difficultyLevel.value = contentNode.classification.difficulty_level
    reviewState.value = contentNode.classification.review_state
  }

  return {
    title,
    contentType,
    skill,
    concept,
    difficultyLevel,
    reviewState,
    toCreateContentNodeRequest,
    toUpdateContentNodeRequest,
    loadFromContentNode,
  }
}
