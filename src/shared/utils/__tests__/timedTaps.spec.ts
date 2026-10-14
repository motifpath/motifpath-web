import { describe, expect, it } from 'vitest'

import { gradeTimedTaps } from '@/shared/utils/timedTaps'
import type { GradedTake, GuideToneTake, TimedTap } from '@/shared/utils/timedTaps'
import golden from '@/api/generated/golden/practice-graders/timed_taps.v1.json'

const instruments: Record<string, { tuning: string[] }> = golden.reference.instruments
const progressions: Record<string, { bars: string[] }> = golden.reference.progressions

// The server grades the same takes; these shared cases keep the feedback a student sees in
// agreement with what's recorded. A tap off the instrument is the only rejection a client can
// meet: the others are about the item or the response's shape.
describe('gradeTimedTaps against the timed_taps.v1 golden cases', () => {
  interface Case {
    name: string
    take: GuideToneTake
    taps: TimedTap[]
    want: GradedTake | null
  }

  const cases = golden.cases.flatMap(({ name, item_key, response, expected }): Case[] => {
    if (response.response_type !== 'timed_taps' || !response.taps || !response.music_key || !response.tempo_bpm) return []
    const [, layout = '', progression = ''] = item_key.split(':')
    const tuning = instruments[layout]?.tuning
    const bars = progressions[progression]?.bars
    if (!tuning || !bars) return []
    const tone = response.tone === '7' ? '7' : '3'
    const take: GuideToneTake = { tuning, bars, key: response.music_key, tone, tempoBpm: response.tempo_bpm }
    if ('evidence' in expected && expected.evidence) {
      const { correct, latency_ms, answer_key } = expected.evidence
      return [{ name, take, taps: response.taps, want: { correct, latencyMs: latency_ms, bars: answer_key.bars } }]
    }
    if ('reason' in expected && expected.reason === 'invalid_cell') return [{ name, take, taps: response.taps, want: null }]
    return []
  })

  it('has cases to run, right, wrong and refused', () => {
    expect(cases.some((c) => c.want?.correct === true)).toBe(true)
    expect(cases.some((c) => c.want?.correct === false)).toBe(true)
    expect(cases.some((c) => c.want === null)).toBe(true)
  })

  it.each(cases)('$name', ({ take, taps, want }) => {
    expect(gradeTimedTaps(take, taps)).toEqual(want)
  })
})

describe('gradeTimedTaps', () => {
  it('is null for a tempo below one beat a minute', () => {
    expect(gradeTimedTaps({ tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bars: ['I'], key: 'C', tone: '3', tempoBpm: 0 }, [])).toBeNull()
  })
})
