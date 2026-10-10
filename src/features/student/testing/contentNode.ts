import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']

/** Builds a playable video `ContentNode` for tests. */
export function makeVideoNode(id: string, overrides: Partial<ContentNode> = {}): ContentNode {
  return {
    content_node_id: id,
    teacher: { user_id: 'teacher-1', display_name: 'Teacher One' },
    title: 'Minor pentatonic shape 1',
    content_type: 'video',
    classification: {
      skills: [],
      concepts: [],
      difficulty_level: 'beginner',
      review_state: 'confirmed',
    },
    media_url: 'https://cdn.example.test/lesson.mp4',
    languages: [{ code: 'any', name: 'Language-agnostic' }],
    instrument_ids: [],
    created_at: '2026-09-21T12:00:00Z',
    ...overrides,
  }
}

/** Builds an article `ContentNode` for tests, one paragraph per given text. */
export function makeArticleNode(id: string, paragraphs: string[], overrides: Partial<ContentNode> = {}): ContentNode {
  return makeVideoNode(id, {
    title: 'Reading chord boxes',
    content_type: 'article',
    media_url: undefined,
    rich_content: {
      type: 'doc',
      content: paragraphs.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
    },
    ...overrides,
  })
}
