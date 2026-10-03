import { describe, expect, it } from 'vitest'

import type {
  AutoGradedEvidence,
  ChordChangeItem,
  FretboardCellItem,
  PlayAlongItem,
  Rating,
  SelfAssessedEvidence,
  TeacherReviewedEvidence,
} from '@/spikes/practice/model'
import { deriveState } from '@/spikes/practice/mastery'

const DAY = 86_400_000
const T0 = Date.parse('2026-10-01T09:00:00Z')
const at = (days: number) => new Date(T0 + days * DAY).toISOString()

const cell: FretboardCellItem = {
  kind: 'fretboard_cell',
  item_key: 'cell',
  label: 'cell',
  skill_ids: [],
  concept_ids: [],
  instrument_ids: [],
  instrument_id: 'g',
  string: 6,
  fret: 3,
  note_name: 'G',
}

const drill: PlayAlongItem = {
  kind: 'play_along',
  item_key: 'drill',
  label: 'drill',
  skill_ids: [],
  concept_ids: [],
  instrument_ids: [],
  diagram_id: 'd',
  purpose: 'technique',
  params: {
    start_bpm: 60,
    target_bpm: 120,
    step_bpm: 5,
    cleans_to_advance: 2,
    loops: 4,
    count_in_beats: 4,
  },
}

const changes: ChordChangeItem = {
  kind: 'chord_change',
  item_key: 'changes',
  label: 'changes',
  skill_ids: [],
  concept_ids: [],
  instrument_ids: [],
  from_diagram_id: 'am',
  to_diagram_id: 'c',
  target_changes_per_minute: 60,
}

let n = 0
function answer(day: number, correct: boolean, latency_ms = 1500): AutoGradedEvidence {
  return {
    evidence_id: `e${n++}`,
    student_id: 's',
    item_key: 'cell',
    occurred_at: at(day),
    session_id: null,
    source: 'auto_graded',
    correct,
    latency_ms,
    tap_ms: 0,
    grader: 'fretboard_cell.v1',
    response: { kind: 'name_the_note', chosen_note: correct ? 'E' : 'F', latency_ms },
  }
}

function self(
  day: number,
  rating: Rating,
  bpm: number | null,
  item_key = 'drill',
): SelfAssessedEvidence {
  return {
    evidence_id: `e${n++}`,
    student_id: 's',
    item_key,
    occurred_at: at(day),
    session_id: null,
    source: 'self_assessed',
    rating,
    bpm,
    changes_per_minute: null,
    grader: 'self_rating.v1',
    response: { kind: 'self_rating', rating, bpm, changes_per_minute: null },
  }
}

function teacher(
  day: number,
  rating: Rating,
  bpm: number | null,
  verified: boolean,
): TeacherReviewedEvidence {
  return {
    evidence_id: `e${n++}`,
    student_id: 's',
    item_key: 'drill',
    occurred_at: at(day),
    session_id: null,
    source: 'teacher_reviewed',
    teacher_note_id: 'note',
    rating,
    bpm,
    changes_per_minute: null,
    verified,
  }
}

describe('deriveState — an item never practised', () => {
  it('is new, with nothing due', () => {
    const s = deriveState(cell, [], new Date(T0))
    expect(s).toMatchObject({
      attempts: 0,
      level: 'new',
      effective_level: 'new',
      box: 0,
      due_at: null,
    })
  })
})

describe('deriveState — spaced repetition', () => {
  it('a first correct answer puts the item in box 1, due a day later', () => {
    const s = deriveState(cell, [answer(0, true)], new Date(T0))
    expect(s.box).toBe(1)
    expect(s.due_at).toBe(at(1))
  })

  it('more correct answers before the item is due do not move it up again', () => {
    const s = deriveState(
      cell,
      [answer(0, true), answer(0.01, true), answer(0.02, true)],
      new Date(T0),
    )
    expect(s.box).toBe(1)
  })

  it('a correct answer once due moves it up a box, doubling the wait', () => {
    const s = deriveState(cell, [answer(0, true), answer(1, true)], new Date(T0 + DAY))
    expect(s.box).toBe(2)
    expect(s.due_at).toBe(at(3))
  })

  it('a wrong answer sends it back to box 1', () => {
    const s = deriveState(
      cell,
      [answer(0, true), answer(1, true), answer(3, false)],
      new Date(T0 + 3 * DAY),
    )
    expect(s.box).toBe(1)
    expect(s.due_at).toBe(at(4))
  })
})

describe('deriveState — levels', () => {
  it('accurate needs at least three attempts, mostly right', () => {
    const slow = 6000
    const s = deriveState(
      cell,
      [answer(0, true, slow), answer(1, true, slow), answer(3, true, slow)],
      new Date(T0 + 3 * DAY),
    )
    expect(s.level).toBe('accurate')
  })

  it('fluent needs speed as well as accuracy', () => {
    const fast = [0, 1, 3, 7, 7.1].map((d) => answer(d, true, 1200))
    expect(deriveState(cell, fast, new Date(T0 + 7.1 * DAY)).level).toBe('fluent')
  })

  it('retained needs fluent answers that survived the long gaps', () => {
    const spaced = [0, 1, 3, 7, 15].map((d) => answer(d, true, 1200))
    expect(deriveState(cell, spaced, new Date(T0 + 15 * DAY)).level).toBe('retained')
  })

  it('reports the median latency of correct answers', () => {
    const s = deriveState(
      cell,
      [answer(0, true, 1000), answer(0.1, true, 3000), answer(0.2, false, 9000)],
      new Date(T0),
    )
    expect(s.median_latency_ms).toBe(2000)
  })
})

describe('deriveState — fading', () => {
  it('is fading as soon as its review is due, keeping its level for a while', () => {
    const fast = [0, 1, 3, 7, 7.1].map((d) => answer(d, true, 1200))
    // box 4 → due 8 days after day 7 = day 15
    const s = deriveState(cell, fast, new Date(T0 + 16 * DAY))
    expect(s.fading).toBe(true)
    expect(s.effective_level).toBe('fluent')
  })

  it('is not fading before its review is due', () => {
    const fast = [0, 1, 3, 7, 7.1].map((d) => answer(d, true, 1200))
    expect(deriveState(cell, fast, new Date(T0 + 14 * DAY)).fading).toBe(false)
  })

  it('shows one level lower once overdue by more than its own wait', () => {
    const fast = [0, 1, 3, 7, 7.1].map((d) => answer(d, true, 1200))
    // box 4 → due 8 days after day 7 = day 15; fading after day 23
    const s = deriveState(cell, fast, new Date(T0 + 24 * DAY))
    expect(s.level).toBe('fluent')
    expect(s.fading).toBe(true)
    expect(s.effective_level).toBe('accurate')
  })
})

describe('deriveState — self-assessed play-along', () => {
  it('fluency is the clean tempo against the target', () => {
    const s = deriveState(drill, [self(0, 'clean', 90)], new Date(T0))
    expect(s.fluency).toBeCloseTo(0.75)
    expect(s.best_clean_bpm).toBe(90)
  })

  it('a struggle is a miss: back to box 1', () => {
    const s = deriveState(
      drill,
      [self(0, 'clean', 80), self(1, 'struggled', 85)],
      new Date(T0 + DAY),
    )
    expect(s.box).toBe(1)
  })

  it('"almost" neither moves the item up nor back', () => {
    const s = deriveState(drill, [self(0, 'clean', 80), self(1, 'almost', 85)], new Date(T0 + DAY))
    expect(s.box).toBe(1)
    expect(s.attempts).toBe(2)
  })

  it('a struggle above the best clean tempo is exploring the edge, not a miss', () => {
    const base = [self(0, 'clean', 100), self(1, 'clean', 100)]
    const explored = deriveState(
      drill,
      [...base, self(1.01, 'struggled', 110)],
      new Date(T0 + 2 * DAY),
    )
    const clean = deriveState(drill, base, new Date(T0 + 2 * DAY))
    expect(explored.box).toBe(clean.box)
    expect(explored.accuracy).toBe(clean.accuracy)
    expect(explored.attempts).toBe(3)
  })

  it('a struggle at or below the best clean tempo is a real miss', () => {
    const s = deriveState(
      drill,
      [self(0, 'clean', 100), self(1, 'clean', 100), self(3, 'struggled', 95)],
      new Date(T0 + 3 * DAY),
    )
    expect(s.box).toBe(1)
    expect(s.accuracy).toBeLessThan(1)
  })

  it('a teacher rating always counts, whatever the tempo', () => {
    const s = deriveState(
      drill,
      [self(0, 'clean', 100), teacher(1, 'struggled', 110, false)],
      new Date(T0 + DAY),
    )
    expect(s.box).toBe(1)
  })

  it('chord changes measure changes per minute against the target', () => {
    const e: SelfAssessedEvidence = { ...self(0, 'clean', null, 'changes'), changes_per_minute: 30 }
    const s = deriveState(changes, [e], new Date(T0))
    expect(s.fluency).toBeCloseTo(0.5)
    expect(s.best_changes_per_minute).toBe(30)
  })
})

describe('deriveState — teacher review', () => {
  it('verifies the item when the teacher vouches for it', () => {
    const s = deriveState(
      drill,
      [self(0, 'clean', 100), teacher(1, 'clean', 100, true)],
      new Date(T0 + DAY),
    )
    expect(s.verified).toBe(true)
  })

  it('a later review without the vouch withdraws it', () => {
    const s = deriveState(
      drill,
      [teacher(0, 'clean', 100, true), teacher(5, 'almost', 100, false)],
      new Date(T0 + 5 * DAY),
    )
    expect(s.verified).toBe(false)
  })

  it('weighs more than a self-rating: one review pulls accuracy further', () => {
    const base = [self(0, 'clean', 100), self(1, 'clean', 100)]
    const afterSelf = deriveState(
      drill,
      [...base, self(2, 'struggled', 100)],
      new Date(T0 + 2 * DAY),
    )
    const afterTeacher = deriveState(
      drill,
      [...base, teacher(2, 'struggled', 100, false)],
      new Date(T0 + 2 * DAY),
    )
    expect(afterTeacher.accuracy).toBeLessThan(afterSelf.accuracy)
  })

  it('resets self-claimed tempos: the best clean tempo counts only claims since the review', () => {
    const s = deriveState(
      drill,
      [
        self(0, 'clean', 115),
        self(1, 'clean', 118),
        teacher(2, 'almost', 100, false),
        self(3, 'clean', 95),
      ],
      new Date(T0 + 3 * DAY),
    )
    expect(s.best_clean_bpm).toBe(95)
  })
})
