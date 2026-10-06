import type { components } from '@/api/generated/core-domain'

export type KnowledgeLevel = components['schemas']['KnowledgeLevel']

/** Every knowledge level, from the first seen to the longest kept. */
export const KNOWLEDGE_LEVELS: KnowledgeLevel[] = ['new', 'learning', 'accurate', 'fluent', 'retained']

// Still learning is a step on the way, not a failure, so it never takes the danger colour.
/** The fill a level paints on a drawing, matching the tone of its chip. */
export const LEVEL_FILLS: Record<KnowledgeLevel, string> = {
  new: 'fill-surface-sunken',
  learning: 'fill-warning-muted',
  accurate: 'fill-accent-muted',
  fluent: 'fill-success-muted',
  retained: 'fill-success',
}
