import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']

/**
 * Builds a PromptDocument holding text as a single, unformatted paragraph —
 * the minimal valid document, for test fixtures. An empty string produces
 * an empty paragraph (no text node) — ProseMirror rejects zero-length text
 * nodes as invalid.
 */
export function plainTextPrompt(text: string): PromptDocument {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
  }
}
