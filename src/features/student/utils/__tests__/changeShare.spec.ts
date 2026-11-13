import { describe, expect, it } from 'vitest'

import { CLEAN_SHARES, changeShareRating } from '@/features/student/utils/changeShare'
import golden from '@/api/generated/golden/practice-graders/self_rating.v2.json'

describe('changeShareRating', () => {
  it('offers four shares of clean changes, in quarters', () => {
    expect(CLEAN_SHARES).toEqual([25, 50, 75, 100])
  })

  it('is clean when every change rang clean, almost at three in four, a struggle at half or fewer', () => {
    expect(changeShareRating(100)).toBe('clean')
    expect(changeShareRating(75)).toBe('almost')
    expect(changeShareRating(50)).toBe('struggled')
    expect(changeShareRating(25)).toBe('struggled')
  })
})

// The server derives the same rating whatever is sent; these shared cases keep what the client
// sends in agreement with what's recorded.
describe('changeShareRating against the self_rating.v2 golden cases', () => {
  const takeCases = golden.cases.filter(
    (c) =>
      (c.item_key.startsWith('chord_change:') || c.item_key.startsWith('root_change:')) &&
      c.expected.result === 'graded' &&
      'evidence' in c.expected &&
      'clean_share_percent' in c.response,
  )

  it('covers the takes of changes', () => {
    expect(takeCases.length).toBeGreaterThan(3)
  })

  it.each(takeCases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const { clean_share_percent: share } = c.response as { clean_share_percent: 25 | 50 | 75 | 100 }
    const evidence = (c.expected as { evidence: { rating: string } }).evidence
    expect(changeShareRating(share)).toBe(evidence.rating)
  })
})
