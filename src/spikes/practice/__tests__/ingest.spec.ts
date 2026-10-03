import { describe, expect, it } from 'vitest'

import { gradeContext, items } from '@/spikes/practice/fixtures/catalog'
import { ingestAnswer } from '@/spikes/practice/ingest'
import type { ItemAnsweredEvent } from '@/spikes/practice/model'

const cell = items.find((i) => i.kind === 'fretboard_cell' && i.string === 5 && i.fret === 3)!

function answered(overrides: Partial<ItemAnsweredEvent>): ItemAnsweredEvent {
  return {
    event_type: 'practice.item_answered',
    event_id: 'ev-1',
    student_id: 's',
    session_id: 'session',
    occurred_at: '2026-10-20T09:00:00Z',
    item_key: cell.item_key,
    response: { kind: 'name_the_note', chosen_note: 'C', latency_ms: 1800 },
    ...overrides,
  }
}

describe('ingestAnswer', () => {
  it('grades the raw response into evidence that keeps the response and the grader', () => {
    expect(ingestAnswer(answered({}), items, gradeContext)).toEqual({
      evidence_id: 'ev-1',
      student_id: 's',
      session_id: 'session',
      occurred_at: '2026-10-20T09:00:00Z',
      item_key: cell.item_key,
      source: 'auto_graded',
      correct: true,
      latency_ms: 1800,
      grader: 'fretboard_cell.v1',
      response: { kind: 'name_the_note', chosen_note: 'C', latency_ms: 1800 },
    })
  })

  it('stores nothing for a response the grader rejects', () => {
    const result = ingestAnswer(
      answered({ response: { kind: 'option_choice', option_id: 'b', latency_ms: 900 } }),
      items,
      gradeContext,
    )
    expect(result).toEqual({ rejected: 'response_does_not_fit_item' })
  })

  it('stores nothing for an item it does not know', () => {
    expect(ingestAnswer(answered({ item_key: 'fretboard_cell:nope:1:1' }), items, gradeContext)).toEqual({
      rejected: 'unknown_item',
    })
  })
})
