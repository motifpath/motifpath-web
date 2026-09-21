import { describe, expect, it } from 'vitest'

import { useContentNodeForm } from '@/features/teacher/composables/useContentNodeForm'

describe('useContentNodeForm', () => {
  it('defaults to a video content node with empty classification', () => {
    const form = useContentNodeForm()

    expect(form.title.value).toBe('')
    expect(form.contentType.value).toBe('video')
    expect(form.skillIds.value).toEqual([])
    expect(form.conceptIds.value).toEqual([])
    expect(form.difficultyLevel.value).toBe('beginner')
    expect(form.reviewState.value).toBeNull()
  })

  describe('toCreateContentNodeRequest', () => {
    it('maps form state to a CreateContentNodeRequest, defaulting to language-agnostic', () => {
      const form = useContentNodeForm()
      form.title.value = 'Alternate picking basics'
      form.contentType.value = 'video'
      form.skillIds.value = ['s-1']
      form.conceptIds.value = ['c-1']
      form.difficultyLevel.value = 'intermediate'

      expect(form.toCreateContentNodeRequest()).toEqual({
        title: 'Alternate picking basics',
        content_type: 'video',
        classification: {
          skill_ids: ['s-1'],
          concept_ids: ['c-1'],
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
      form.skillIds.value = ['s-1']
      form.conceptIds.value = ['c-1']
      form.difficultyLevel.value = 'intermediate'

      const request = form.toUpdateContentNodeRequest()

      expect(request).toEqual({
        title: 'Alternate picking basics',
        classification: {
          skill_ids: ['s-1'],
          concept_ids: ['c-1'],
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
          skills: [{ skill_id: 's-1', name: 'alternate-picking', parent_id: null }],
          concepts: [{ concept_id: 'c-1', name: 'picking-technique', parent_id: null }],
          difficulty_level: 'advanced',
          review_state: 'confirmed',
        },
        languages: [],
        created_at: '2026-01-01T00:00:00Z',
      })

      expect(form.title.value).toBe('Alternate picking basics')
      expect(form.contentType.value).toBe('article')
      expect(form.skillIds.value).toEqual(['s-1'])
      expect(form.conceptIds.value).toEqual(['c-1'])
      expect(form.difficultyLevel.value).toBe('advanced')
      expect(form.reviewState.value).toBe('confirmed')
    })
  })
})
