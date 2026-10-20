import { describe, expect, it } from 'vitest'

import { changeMinuteRating } from '@/features/student/utils/changeMinute'
import golden from '@/api/generated/golden/practice-graders/self_rating.v1.json'

describe('changeMinuteRating', () => {
  it('is clean from 90% of the beats changed cleanly', () => {
    expect(changeMinuteRating(54, 60)).toBe('clean')
    expect(changeMinuteRating(60, 60)).toBe('clean')
  })

  it('is almost from 60% of the beats', () => {
    expect(changeMinuteRating(53, 60)).toBe('almost')
    expect(changeMinuteRating(36, 60)).toBe('almost')
  })

  it('is a struggle below 60%, a minute with no clean change included', () => {
    expect(changeMinuteRating(35, 60)).toBe('struggled')
    expect(changeMinuteRating(0, 40)).toBe('struggled')
  })
})

// The server derives the same rating whatever is sent; these shared cases keep what the client
// sends in agreement with what's recorded.
describe('changeMinuteRating against the self_rating.v1 golden cases', () => {
  const changeCases = golden.cases.filter(
    (c) =>
      (c.item_key.startsWith('chord_change:') || c.item_key.startsWith('root_change:')) &&
      c.expected.result === 'graded' &&
      'evidence' in c.expected,
  )

  it('covers the minutes of changes', () => {
    expect(changeCases.length).toBeGreaterThan(4)
  })

  it.each(changeCases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const { tempo_bpm: tempo, changes_per_minute: changes } = c.response as { tempo_bpm: number; changes_per_minute: number }
    const evidence = (c.expected as { evidence: { rating: string } }).evidence
    expect(changeMinuteRating(changes, tempo)).toBe(evidence.rating)
  })
})
