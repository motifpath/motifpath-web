import { describe, expect, it } from 'vitest'

import { summarize } from '@/spikes/commit-point/trialLog'
import type { Trial } from '@/spikes/commit-point/trialLog'

function trial(overrides: Partial<Trial>): Trial {
  return { caseId: 'P3', variant: 'A', itemKey: 'x', answerMs: 1000, outcome: 'right', ...overrides }
}

describe('summarizing the trials of a run', () => {
  it('groups by case and variant, in case then variant order', () => {
    const rows = summarize([trial({ caseId: 'P3', variant: 'B' }), trial({ caseId: 'P1', variant: 'A' }), trial({ caseId: 'P3', variant: 'A' })])
    expect(rows.map((row) => `${row.caseId}${row.variant}`)).toEqual(['P1A', 'P3A', 'P3B'])
  })

  it('counts trials and the share answered right', () => {
    const [row] = summarize([trial({}), trial({ outcome: 'wrong' }), trial({ outcome: 'adjacent' }), trial({})])
    expect(row).toMatchObject({ trials: 4, rightShare: 0.5 })
  })

  it('takes the median answer time', () => {
    const [odd] = summarize([trial({ answerMs: 300 }), trial({ answerMs: 100 }), trial({ answerMs: 200 })])
    expect(odd?.medianAnswerMs).toBe(200)
    const [even] = summarize([trial({ answerMs: 100 }), trial({ answerMs: 400 })])
    expect(even?.medianAnswerMs).toBe(250)
  })

  it('reports the share of mis-taps one fret away', () => {
    const [row] = summarize([trial({ outcome: 'adjacent' }), trial({}), trial({}), trial({})])
    expect(row?.misTapShare).toBe(0.25)
  })

  it('counts replays during feedback and items cut off while the clip played', () => {
    const [row] = summarize([
      trial({ caseId: 'P1', replaysDuringFeedback: 2, cutOff: true }),
      trial({ caseId: 'P1', replaysDuringFeedback: 1 }),
      trial({ caseId: 'P1' }),
    ])
    expect(row).toMatchObject({ replaysDuringFeedback: 3, cutOffs: 1 })
  })

  it('counts changed minds before a commit', () => {
    const [row] = summarize([trial({ caseId: 'P2', changedMind: true }), trial({ caseId: 'P2' })])
    expect(row?.changedMinds).toBe(1)
  })
})
