import type { components } from '@/api/generated/core-domain'

export type KnowledgeLevel = components['schemas']['KnowledgeLevel']

/** Every knowledge level, from the first seen to the longest kept. */
export const KNOWLEDGE_LEVELS: KnowledgeLevel[] = ['new', 'learning', 'accurate', 'fluent', 'retained']

/**
 * The fill a level paints on a drawing: one hue, stronger as the level rises, so a map reads
 * "more is better" at a glance in either theme; a new item is left unfilled. Still learning is a
 * step on the way, not a failure, so it never takes the danger colour.
 */
export const LEVEL_FILLS: Record<KnowledgeLevel, string> = {
  new: 'fill-transparent',
  learning: 'fill-success/50',
  accurate: 'fill-success/[.67]',
  fluent: 'fill-success/[.83]',
  retained: 'fill-success',
}
