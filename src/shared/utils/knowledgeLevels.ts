import type { components } from '@/api/generated/core-domain'

export type KnowledgeLevel = components['schemas']['KnowledgeLevel']

/** Every knowledge level, from the first seen to the longest kept. */
export const KNOWLEDGE_LEVELS: KnowledgeLevel[] = ['new', 'learning', 'accurate', 'fluent', 'retained']

/**
 * The fill a level paints on a drawing: a hue of its own for each level a student has reached, so
 * a map tells them apart at a glance; a new item is left unfilled. Still learning is a step on the
 * way, not a failure, so it never takes the danger colour.
 */
export const LEVEL_FILLS: Record<KnowledgeLevel, string> = {
  new: 'fill-transparent',
  learning: 'fill-level-learning',
  accurate: 'fill-level-accurate',
  fluent: 'fill-level-fluent',
  retained: 'fill-level-retained',
}
