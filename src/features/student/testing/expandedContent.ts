import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

const CREATED_AT = '2026-09-21T12:00:00Z'

/**
 * Builds a video-timed image `ExpandedContent` for tests, shown from
 * `triggerAtSeconds` up to `hideAtSeconds`. The id doubles as a readable
 * label in assertions.
 */
export function makeTimedCue(
  id: string,
  triggerAtSeconds: number,
  hideAtSeconds: number,
): ExpandedContent {
  return {
    expanded_content_id: id,
    content_node_id: 'node-1',
    content_type: 'image',
    media_url: `https://cdn.example.test/${id}.png`,
    created_at: CREATED_AT,
    trigger_at_seconds: triggerAtSeconds,
    hide_at_seconds: hideAtSeconds,
  }
}

/**
 * Builds a paragraph-triggered (article-style) `ExpandedContent` for tests —
 * it carries no video timing.
 */
export function makeParagraphCue(id: string, triggerAtParagraph: number): ExpandedContent {
  return {
    expanded_content_id: id,
    content_node_id: 'node-1',
    content_type: 'image',
    media_url: `https://cdn.example.test/${id}.png`,
    created_at: CREATED_AT,
    trigger_at_paragraph: triggerAtParagraph,
    duration_ms: 5000,
  }
}
