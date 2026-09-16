import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']

/**
 * Whether an exercise's option set legitimately requires selecting more than
 * one answer. Never expose is_correct itself past this boolean — callers use
 * it to drive ExerciseView's radio-vs-checkbox affordance, not to know which
 * option is correct.
 */
export function hasMultipleCorrectOptions(options: Option[]): boolean {
  return options.filter((option) => option.is_correct).length > 1
}
