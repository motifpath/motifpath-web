import { describe, expect, it } from 'vitest'

import { anchoredPosition } from '@/shared/utils/anchoredPosition'

const viewport = { width: 1000, height: 800 }

function rect(left: number, top: number, width = 40, height = 40) {
  return { left, top, right: left + width, bottom: top + height }
}

describe('anchoredPosition', () => {
  it('opens below a trigger in the top half, aligned to its left edge on the left side', () => {
    expect(anchoredPosition(rect(100, 100), viewport)).toEqual({ top: '148px', left: '100px' })
  })

  it('opens above a trigger in the bottom half', () => {
    expect(anchoredPosition(rect(100, 600), viewport)).toEqual({ bottom: '208px', left: '100px' })
  })

  it('aligns to the right edge of a trigger on the right side', () => {
    expect(anchoredPosition(rect(900, 100), viewport)).toEqual({ top: '148px', right: '60px' })
  })
})
