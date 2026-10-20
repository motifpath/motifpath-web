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

/**
 * A single paragraph of text carrying a `textStyle` mark with the given
 * color and/or background color — for tests that need pre-colored text.
 */
export function coloredTextPrompt(text: string, style: { color?: string; backgroundColor?: string }): PromptDocument {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text, marks: [{ type: 'textStyle', attrs: style }] }] }],
  }
}
