import { beforeEach, describe, expect, it } from 'vitest'

import { STUDENT_ID, TEACHER_ID } from '@/spikes/practice/fixtures/catalog'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

describe('usePracticeSpike — live activity', () => {
  const spike = usePracticeSpike()
  beforeEach(() => spike.resetLive())

  it('counts a live answer toward the derived state', () => {
    const key = 'fretboard_cell:instrument-guitar:4:2'
    const before = spike.states.value.get(key)!.attempts
    spike.addEvidence({
      evidence_id: 'live-1',
      student_id: STUDENT_ID,
      item_key: key,
      occurred_at: spike.clock(),
      session_id: 's',
      source: 'auto_graded',
      correct: true,
      latency_ms: 1500,
    })
    expect(spike.states.value.get(key)!.attempts).toBe(before + 1)
  })

  it('keeps live events in the order they happened', () => {
    const a = spike.clock()
    const b = spike.clock()
    expect(Date.parse(b)).toBeGreaterThan(Date.parse(a))
  })

  it("brings a live teacher note into the next session's suggestions", () => {
    spike.addNote(
      {
        teacher_note_id: 'n',
        student_id: STUDENT_ID,
        teacher_id: TEACHER_ID,
        created_at: spike.clock(),
        take_id: null,
        item_key: null,
        rating: null,
        bpm: null,
        verified: false,
        rubric: {},
        comments: [],
        summary: 'Work on chord changes',
        needs_work: { skill_ids: ['change-chords'], concept_ids: [] },
        suggested_item_keys: [],
      },
      null,
    )
    expect(spike.activeNotes.value.map((n) => n.teacher_note_id)).toContain('n')
    const focus = spike.compose(true, 5).blocks.find((b) => b.kind === 'focus')!
    expect(focus.entries[0]!.reason).toBe('teacher_suggested')
  })
})
