import { describe, expect, it } from 'vitest'

import { medianTapMs } from '@/features/student/utils/tapCheck'

describe('medianTapMs', () => {
  it('is the middle tap time of an odd count', () => {
    expect(medianTapMs([400, 300, 350])).toBe(350)
  })

  it('is the mean of the two middle tap times of an even count, rounded', () => {
    expect(medianTapMs([300, 341, 320, 500])).toBe(331)
  })

  it('is null without taps', () => {
    expect(medianTapMs([])).toBeNull()
  })
})
