import { describe, expect, it } from 'vitest'

import { hasMultipleCorrectOptions, isExactMatch } from '@/shared/utils/exerciseOptions'
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
