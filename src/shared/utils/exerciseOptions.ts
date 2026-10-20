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

/**
 * Whether the selected options are exactly the exercise's correct ones: an exercise
 * can have more than one correct option, and only some of them, or all of them and
 * a wrong one, is a wrong answer.
 */
export function isExactMatch(options: Option[], optionIds: string[]): boolean {
  const correctIds = options.filter((option) => option.is_correct).map((option) => option.option_id)
  if (correctIds.length !== optionIds.length) return false
  const selected = new Set(optionIds)
  return correctIds.every((id) => selected.has(id))
}
