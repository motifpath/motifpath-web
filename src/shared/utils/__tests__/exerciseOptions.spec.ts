import { describe, expect, it } from 'vitest'

import { hasMultipleCorrectOptions, isExactMatch } from '@/shared/utils/exerciseOptions'
import golden from '@/api/generated/golden/practice-graders/exercise_option.v1.json'
import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']

describe('hasMultipleCorrectOptions', () => {
  it('is false when only one option is correct', () => {
    const options: Option[] = [
      { option_id: 'o1', is_correct: true, label: 'A' },
      { option_id: 'o2', is_correct: false, label: 'B' },
    ]

    expect(hasMultipleCorrectOptions(options)).toBe(false)
  })

  it('is true when more than one option is correct', () => {
    const options: Option[] = [
      { option_id: 'o1', is_correct: true, label: 'A' },
      { option_id: 'o2', is_correct: true, label: 'B' },
      { option_id: 'o3', is_correct: false, label: 'C' },
    ]

    expect(hasMultipleCorrectOptions(options)).toBe(true)
  })

  it('is false for an empty options list', () => {
    expect(hasMultipleCorrectOptions([])).toBe(false)
  })
})

describe('isExactMatch', () => {
  const options: Option[] = [
    { option_id: 'o1', is_correct: true, label: 'C' },
    { option_id: 'o2', is_correct: false, label: 'D' },
    { option_id: 'o3', is_correct: true, label: 'E' },
  ]

  it('is true for exactly the correct options, in any order', () => {
    expect(isExactMatch(options, ['o3', 'o1'])).toBe(true)
  })

  it('is false for only some of the correct options', () => {
    expect(isExactMatch(options, ['o1'])).toBe(false)
  })

  it('is false for the correct options and a wrong one', () => {
    expect(isExactMatch(options, ['o1', 'o2', 'o3'])).toBe(false)
  })
})

// The server grades the same answers; these shared cases keep the feedback a student
// sees in agreement with what's recorded.
describe('isExactMatch against the exercise_option.v1 golden cases', () => {
  const graded = golden.cases.flatMap(({ name, item_key, response, expected }) => {
    const optionIds = 'option_ids' in response ? response.option_ids : undefined
    const correct = 'evidence' in expected ? expected.evidence?.correct : undefined
    return optionIds && correct !== undefined ? [{ name, itemKey: item_key, optionIds, correct }] : []
  })

  it('has graded cases to run', () => {
    expect(graded.length).toBeGreaterThan(0)
  })

  it.each(graded)('$name', ({ itemKey, optionIds, correct }) => {
    const exercise = Object.entries(golden.reference.exercises).find(([id]) => `exercise:${id}` === itemKey)?.[1]
    if (!exercise) throw new Error(`no reference exercise for ${itemKey}`)
    const options: Option[] = exercise.option_ids.map((id) => ({ option_id: id, is_correct: exercise.correct_option_ids.includes(id) }))

    expect(isExactMatch(options, optionIds)).toBe(correct)
  })
})
