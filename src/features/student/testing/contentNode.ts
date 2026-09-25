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
    created_at: '2026-09-21T12:00:00Z',
    ...overrides,
  }
}
