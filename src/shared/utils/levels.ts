import type { components } from '@/api/generated/core-domain'

export type DifficultyLevel = components['schemas']['ClassificationInput']['difficulty_level']

/** Every difficulty level, easiest first. */
export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  'beginner',
  'early_intermediate',
  'intermediate',
  'advanced',
  'expert',
]
