import { describe, expect, it } from 'vitest'

import { ALTERNATE_PICKING, cellItems, itemByKey, items } from '@/spikes/practice/fixtures/catalog'
import { deriveState } from '@/spikes/practice/mastery'
import type { Evidence } from '@/spikes/practice/model'
import { simulate } from '@/spikes/practice/simulator'

const START = new Date('2026-10-01T09:00:00Z')
const DAY = 86_400_000

function stateAt(evidence: Evidence[], key: string, day: number) {
  const item = itemByKey(key)!
  return deriveState(
    item,
    evidence.filter((e) => e.item_key === key),
    new Date(START.getTime() + day * DAY),
  )
}

const string6 = cellItems.filter((c) => c.string === 6).map((c) => c.item_key)

describe('simulate', () => {
  it('improving: most string-6 cells are fluent or better after three weeks', () => {
    const { evidence } = simulate('improving', { items, start: START, days: 21, seed: 1 })
    const fluent = string6.filter((k) => ['fluent', 'retained'].includes(stateAt(evidence, k, 21).effective_level))
    expect(fluent.length).toBeGreaterThanOrEqual(8)
    expect(stateAt(evidence, ALTERNATE_PICKING, 21).best_clean_bpm).toBeGreaterThanOrEqual(100)
  })

  it('plateau: practises every day but nothing reaches fluent', () => {
    const { evidence } = simulate('plateau', { items, start: START, days: 21, seed: 1 })
    const fluent = string6.filter((k) => ['fluent', 'retained'].includes(stateAt(evidence, k, 21).level))
    expect(fluent.length).toBeLessThanOrEqual(2)
    expect(stateAt(evidence, ALTERNATE_PICKING, 21).best_clean_bpm ?? 0).toBeLessThan(90)
  })

  it('decaying: stops after ten days, and two weeks later most practised cells are fading', () => {
    const { evidence } = simulate('decaying', { items, start: START, days: 24, seed: 1 })
    const fading = string6.filter((k) => stateAt(evidence, k, 24).fading)
    expect(fading.length).toBeGreaterThanOrEqual(8)
  })

  it('overconfident: the teacher review corrects the self-claimed tempo and leaves it unverified', () => {
    const { evidence, notes } = simulate('overconfident', { items, start: START, days: 21, seed: 1 })
    expect(notes).toHaveLength(1)
    expect(notes[0]!.needs_work.skill_ids).toContain('alternate-picking')
    const s = stateAt(evidence, ALTERNATE_PICKING, 21)
    expect(s.verified).toBe(false)
    expect(s.best_clean_bpm ?? 0).toBeLessThanOrEqual(100)
  })

  it('is the same history for the same seed', () => {
    const a = simulate('improving', { items, start: START, days: 5, seed: 3 })
    const b = simulate('improving', { items, start: START, days: 5, seed: 3 })
    expect(a).toEqual(b)
  })
})

describe('simulate — every answer goes through grading', () => {
  it('keeps the raw response and the grader on every answer and self-rating', () => {
    for (const archetype of ['improving', 'plateau', 'decaying', 'overconfident'] as const) {
      const { evidence } = simulate(archetype, { items, start: START, days: 21, seed: 1 })
      for (const e of evidence) {
        if (e.source === 'teacher_reviewed') continue
        expect(e.grader).toMatch(/\.v\d+$/)
        expect(e.response).toBeDefined()
      }
    }
  })
})
