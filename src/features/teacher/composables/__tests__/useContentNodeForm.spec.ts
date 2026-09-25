import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { useContentNodeForm } from '@/features/teacher/composables/useContentNodeForm'

const ARTICLE_BODY: components['schemas']['PromptDocument'] = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
}

describe('useContentNodeForm', () => {
  it('defaults to a video content node with empty classification', () => {
    const form = useContentNodeForm()

    expect(form.title.value).toBe('')
    expect(form.contentType.value).toBe('video')
    expect(form.skillIds.value).toEqual([])
    expect(form.conceptIds.value).toEqual([])
    expect(form.difficultyLevel.value).toBe('beginner')
    expect(form.reviewState.value).toBeNull()
    expect(form.mediaUrl.value).toBe('')
    expect(form.richContent.value).toEqual({ type: 'doc', content: [] })
    expect(form.hasBody.value).toBe(false)
  })

  describe('hasBody', () => {
    it('for a video, is true once a non-blank media URL is entered', () => {
      const form = useContentNodeForm()
      form.contentType.value = 'video'

      form.mediaUrl.value = '   '
      expect(form.hasBody.value).toBe(false)

      form.mediaUrl.value = 'https://cdn.example.com/lesson.mp4'
      expect(form.hasBody.value).toBe(true)
    })

    it.each(['not a url', '/videos/lesson.mp4', 'javascript:alert(1)', 'ftp://cdn.example.com/a.mp4'])(
      'for a video, is false for a media URL that is not http(s): %s',
      (value) => {
        const form = useContentNodeForm()
        form.contentType.value = 'video'
        form.mediaUrl.value = value

        expect(form.hasBody.value).toBe(false)
        expect(form.mediaUrlInvalid.value).toBe(true)
      },
    )

    it('reports a media URL as invalid only when one was typed', () => {
      const form = useContentNodeForm()
      form.contentType.value = 'video'

      expect(form.mediaUrlInvalid.value).toBe(false)

      form.mediaUrl.value = 'https://youtu.be/dQw4w9WgXcQ'
      expect(form.mediaUrlInvalid.value).toBe(false)
    })

    it('never reports a media URL as invalid for an article', () => {
      const form = useContentNodeForm()
      form.contentType.value = 'article'
      form.mediaUrl.value = 'not a url'

      expect(form.mediaUrlInvalid.value).toBe(false)
    })

    it('for an article, is true once the document has content, ignoring any stale media URL', () => {
      const form = useContentNodeForm()
      form.contentType.value = 'article'
      form.mediaUrl.value = 'https://cdn.example.com/lesson.mp4'
      expect(form.hasBody.value).toBe(false)

      form.richContent.value = ARTICLE_BODY
      expect(form.hasBody.value).toBe(true)
    })
  })

  describe('toCreateContentNodeRequest', () => {
    it('maps form state to a CreateContentNodeRequest, defaulting to language-agnostic', () => {
      const form = useContentNodeForm()
      form.title.value = 'Alternate picking basics'
      form.contentType.value = 'video'
      form.mediaUrl.value = ' https://cdn.example.com/lesson.mp4 '
      form.skillIds.value = ['s-1']
      form.conceptIds.value = ['c-1']
      form.difficultyLevel.value = 'intermediate'

      expect(form.toCreateContentNodeRequest()).toEqual({
        title: 'Alternate picking basics',
        content_type: 'video',
        media_url: 'https://cdn.example.com/lesson.mp4',
        classification: {
          skill_ids: ['s-1'],
          concept_ids: ['c-1'],
          difficulty_level: 'intermediate',
        },
        language_codes: ['any'],
      })
    })

    it('sends rich_content and no media_url for an article, even if a video URL was typed earlier', () => {
      const form = useContentNodeForm()
      form.title.value = 'Picking theory'
      form.contentType.value = 'article'
      form.mediaUrl.value = 'https://cdn.example.com/lesson.mp4'
      form.richContent.value = ARTICLE_BODY

      const request = form.toCreateContentNodeRequest()

      expect(request.rich_content).toEqual(ARTICLE_BODY)
      expect(request).not.toHaveProperty('media_url')
    })
  })

  describe('toUpdateContentNodeRequest', () => {
    it('sends the body matching the loaded content type, and no content_type', () => {
      const form = useContentNodeForm()
      form.contentType.value = 'article'
      form.mediaUrl.value = 'https://cdn.example.com/stale.mp4'
      form.richContent.value = ARTICLE_BODY

      const request = form.toUpdateContentNodeRequest()

      expect(request.rich_content).toEqual(form.richContent.value)
      expect(request).not.toHaveProperty('media_url')
    })

    it('maps form state to an UpdateContentNodeRequest, without content_type', () => {
      const form = useContentNodeForm()
      form.title.value = 'Alternate picking basics'
      form.mediaUrl.value = 'https://cdn.example.com/lesson.mp4'
      form.skillIds.value = ['s-1']
      form.conceptIds.value = ['c-1']
      form.difficultyLevel.value = 'intermediate'

      const request = form.toUpdateContentNodeRequest()

      expect(request).toEqual({
        title: 'Alternate picking basics',
        media_url: 'https://cdn.example.com/lesson.mp4',
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
        teacher: { user_id: 't-1', display_name: 'Teacher One' },
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

    it('hydrates a video node\'s media URL and leaves the article body empty', () => {
      const form = useContentNodeForm()

      form.loadFromContentNode({
        content_node_id: 'cn-1',
        teacher: { user_id: 't-1', display_name: 'Teacher One' },
        title: 'Alternate picking basics',
        content_type: 'video',
        media_url: 'https://cdn.example.com/lesson.mp4',
        classification: {
          skills: [],
          concepts: [],
          difficulty_level: 'beginner',
          review_state: 'pending',
        },
        languages: [],
        created_at: '2026-01-01T00:00:00Z',
      })

      expect(form.mediaUrl.value).toBe('https://cdn.example.com/lesson.mp4')
      expect(form.richContent.value).toEqual({ type: 'doc', content: [] })
    })

    it('hydrates an article node\'s rich content and clears the media URL', () => {
      const form = useContentNodeForm()
      form.mediaUrl.value = 'https://cdn.example.com/leftover.mp4'

      form.loadFromContentNode({
        content_node_id: 'cn-1',
        teacher: { user_id: 't-1', display_name: 'Teacher One' },
        title: 'Picking theory',
        content_type: 'article',
        rich_content: ARTICLE_BODY,
        classification: {
          skills: [],
          concepts: [],
          difficulty_level: 'beginner',
          review_state: 'pending',
        },
        languages: [],
        created_at: '2026-01-01T00:00:00Z',
      })

      expect(form.richContent.value).toEqual(ARTICLE_BODY)
      expect(form.mediaUrl.value).toBe('')
    })

    it('tolerates a legacy video node saved before it carried a body', () => {
      const form = useContentNodeForm()

      form.loadFromContentNode({
        content_node_id: 'cn-1',
        teacher: { user_id: 't-1', display_name: 'Teacher One' },
        title: 'Legacy',
        content_type: 'video',
        classification: {
          skills: [],
          concepts: [],
          difficulty_level: 'beginner',
          review_state: 'pending',
        },
        languages: [],
        created_at: '2026-01-01T00:00:00Z',
      })

      expect(form.mediaUrl.value).toBe('')
      expect(form.hasBody.value).toBe(false)
    })

    it('sends the loaded node\'s own languages back on update instead of resetting them', () => {
      const form = useContentNodeForm()

      form.loadFromContentNode({
        content_node_id: 'cn-1',
        teacher: { user_id: 't-1', display_name: 'Teacher One' },
        title: 'Palhetada alternada',
        content_type: 'video',
        media_url: 'https://cdn.example.com/lesson.mp4',
        classification: {
          skills: [{ skill_id: 's-1', name: 'alternate-picking', parent_id: null }],
          concepts: [{ concept_id: 'c-1', name: 'picking-technique', parent_id: null }],
          difficulty_level: 'beginner',
          review_state: 'pending',
        },
        languages: [{ code: 'pt_BR', name: 'Portuguese (Brazil)' }],
        created_at: '2026-01-01T00:00:00Z',
      })

      expect(form.toUpdateContentNodeRequest().language_codes).toEqual(['pt_BR'])
    })

    it('falls back to language-agnostic when the loaded node carries no languages', () => {
      const form = useContentNodeForm()

      form.loadFromContentNode({
        content_node_id: 'cn-1',
        teacher: { user_id: 't-1', display_name: 'Teacher One' },
        title: 'Legacy',
        content_type: 'video',
        media_url: 'https://cdn.example.com/lesson.mp4',
        classification: { skills: [], concepts: [], difficulty_level: 'beginner', review_state: 'pending' },
        languages: [],
        created_at: '2026-01-01T00:00:00Z',
      })

      expect(form.toUpdateContentNodeRequest().language_codes).toEqual(['any'])
    })
  })
})
