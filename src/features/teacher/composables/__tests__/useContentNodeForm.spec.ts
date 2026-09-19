import { describe, expect, it } from 'vitest'

import { useContentNodeForm } from '@/features/teacher/composables/useContentNodeForm'

describe('useContentNodeForm', () => {
  it('defaults to a video content node with empty classification', () => {
    const form = useContentNodeForm()

    expect(form.title.value).toBe('')
    expect(form.contentType.value).toBe('video')
    expect(form.skill.value).toBe('')
    expect(form.concept.value).toBe('')
    expect(form.difficultyLevel.value).toBe('beginner')
    expect(form.reviewState.value).toBeNull()
  })

  describe('toCreateContentNodeRequest', () => {
    it('maps form state to a CreateContentNodeRequest, defaulting to language-agnostic', () => {
      const form = useContentNodeForm()
      form.title.value = 'Alternate picking basics'
      form.contentType.value = 'video'
      form.skill.value = 'alternate-picking'
      form.concept.value = 'picking-technique'
      form.difficultyLevel.value = 'intermediate'

      expect(form.toCreateContentNodeRequest()).toEqual({
        title: 'Alternate picking basics',
        content_type: 'video',
        classification: {
          skill: 'alternate-picking',
          concept: 'picking-technique',
          difficulty_level: 'intermediate',
        },
        language_codes: ['any'],
      })
    })
  })

  describe('toUpdateContentNodeRequest', () => {
    it('maps form state to an UpdateContentNodeRequest, without content_type', () => {
      const form = useContentNodeForm()
      form.title.value = 'Alternate picking basics'
      form.skill.value = 'alternate-picking'
      form.concept.value = 'picking-technique'
      form.difficultyLevel.value = 'intermediate'

      const request = form.toUpdateContentNodeRequest()

      expect(request).toEqual({
        title: 'Alternate picking basics',
        classification: {
          skill: 'alternate-picking',
          concept: 'picking-technique',
          difficulty_level: 'intermediate',
        },
        language_codes: ['any'],
      })
      expect(request).not.toHaveProperty('content_type')
    })
  })

  describe('loadFromContentNode', () => {
    it('hydrates title, content type, classification, and review state', () => {
      const form = useContentNodeForm()

      form.loadFromContentNode({
        content_node_id: 'cn-1',
        teacher_id: 't-1',
        title: 'Alternate picking basics',
        content_type: 'article',
        classification: {
          skill: 'alternate-picking',
          concept: 'picking-technique',
          difficulty_level: 'advanced',
          review_state: 'confirmed',
        },
        languages: [],
        created_at: '2026-01-01T00:00:00Z',
      })

      expect(form.title.value).toBe('Alternate picking basics')
      expect(form.contentType.value).toBe('article')
      expect(form.skill.value).toBe('alternate-picking')
      expect(form.concept.value).toBe('picking-technique')
      expect(form.difficultyLevel.value).toBe('advanced')
      expect(form.reviewState.value).toBe('confirmed')
    })
  })
})
