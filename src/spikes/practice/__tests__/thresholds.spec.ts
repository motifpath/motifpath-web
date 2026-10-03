import { describe, expect, it } from 'vitest'

import { deriveState } from '@/spikes/practice/mastery'
import type { AutoGradedEvidence, FretboardCellItem } from '@/spikes/practice/model'
import {
  activeThreshold,
  benchmarkThresholds,
  calibrate,
  separatingTime,
  tapBaseline,
  templateOf,
} from '@/spikes/practice/thresholds'
import type { SessionObservation, Threshold, ThresholdBook } from '@/spikes/practice/thresholds'

const T0 = '2026-10-01T00:00:00Z'
const NAME = 'fretboard_cell:name_the_note'

const cell: FretboardCellItem = {
  kind: 'fretboard_cell',
  item_key: 'cell',
  label: 'cell',
  skill_ids: [],
  concept_ids: [],
  instrument_id: 'g',
  string: 6,
  fret: 1,
  note_name: 'F',
}

function threshold(overrides: Partial<Threshold>): Threshold {
  return {
    template: NAME,
    version: 1,
    effective_from: T0,
    fluent_ms: 2000,
    source: 'benchmark',
    sessions: 0,
    students: 0,
    ...overrides,
  }
}

let n = 0
function answer(at: string, latency_ms: number, tap_ms = 0): AutoGradedEvidence {
  return {
    evidence_id: `e${n++}`,
    student_id: 's',
    item_key: 'cell',
    occurred_at: at,
    session_id: null,
    source: 'auto_graded',
    correct: true,
    latency_ms,
    tap_ms,
    grader: 'fretboard_cell.v1',
    response: { kind: 'name_the_note', chosen_note: 'F', latency_ms },
  }
}

function obs(net: number, felt: SessionObservation['felt'], student = 's'): SessionObservation {
  return {
    template: NAME,
    student_id: student,
    session_id: `${student}-${net}-${felt}`,
    median_net_ms: net,
    felt,
  }
}

describe('templateOf', () => {
  it('times fretboard drills per kind of question, exercises per exercise, play-alongs not at all', () => {
    expect(templateOf(cell, { kind: 'find_the_note', string: 6, fret: 1, latency_ms: 1 })).toBe(
      'fretboard_cell:find_the_note',
    )
    expect(templateOf(cell, { kind: 'name_the_note', chosen_note: 'F', latency_ms: 1 })).toBe(NAME)
    expect(
      templateOf(
        {
          kind: 'exercise',
          item_key: 'x',
          label: 'x',
          skill_ids: [],
          concept_ids: [],
          exercise_id: 'ex-1',
          estimated_seconds: 20,
        },
        { kind: 'option_choice', option_id: 'a', latency_ms: 1 },
      ),
    ).toBe('exercise:ex-1')
    expect(
      templateOf(
        {
          kind: 'chord_change',
          item_key: 'c',
          label: 'c',
          skill_ids: [],
          concept_ids: [],
          from_diagram_id: 'a',
          to_diagram_id: 'b',
          target_changes_per_minute: 60,
        },
        { kind: 'self_rating', rating: 'clean', bpm: null, changes_per_minute: 40 },
      ),
    ).toBeNull()
  })
})

describe('benchmarkThresholds', () => {
  it('sets the first version from the team’s times, net of their tap time, times a margin', () => {
    const [t] = benchmarkThresholds(
      [{ template: NAME, latencies_ms: [1200, 1400, 1600], tap_ms: 400 }],
      T0,
    )
    // median 1400 − tap 400 = 1000 net; fluent at twice the team's net time.
    expect(t).toEqual(threshold({ fluent_ms: 2000 }))
  })
})

describe('tapBaseline', () => {
  it('is the median tap time once there are enough taps', () => {
    expect(tapBaseline([500, 700, 600, 900, 650])).toBe(650)
  })
  it('is unknown with too few taps', () => {
    expect(tapBaseline([500, 700])).toBeNull()
  })
})

describe('activeThreshold', () => {
  const book: ThresholdBook = [
    threshold({}),
    threshold({ version: 2, effective_from: '2026-10-10T00:00:00Z', fluent_ms: 2600 }),
  ]
  it('uses the version in force when the answer happened', () => {
    expect(activeThreshold(book, NAME, '2026-10-05T00:00:00Z')?.version).toBe(1)
    expect(activeThreshold(book, NAME, '2026-10-12T00:00:00Z')?.version).toBe(2)
  })
})

describe('mastery with thresholds', () => {
  const book: ThresholdBook = [threshold({ fluent_ms: 1500 })]

  it('compares the time spent knowing, not tapping: a slow tapper who knows it is as fluent', () => {
    const now = new Date('2026-10-02T00:00:00Z')
    const desktop = deriveState(cell, [answer('2026-10-01T10:00:00Z', 1800, 300)], now, book)
    const phone = deriveState(cell, [answer('2026-10-01T10:00:00Z', 2200, 700)], now, book)
    expect(phone.fluency).toBeCloseTo(desktop.fluency)
    expect(desktop.fluency).toBeCloseTo(1)
  })

  it('never takes back what earlier answers earned when a later version raises the bar', () => {
    const evidence = Array.from({ length: 6 }, (_, i) =>
      answer(`2026-10-0${i + 1}T10:00:00Z`, 1400),
    )
    const now = new Date('2026-10-08T00:00:00Z')
    const raised: ThresholdBook = [
      ...book,
      threshold({ version: 2, effective_from: '2026-10-07T00:00:00Z', fluent_ms: 700 }),
    ]
    expect(deriveState(cell, evidence, now, raised)).toEqual(deriveState(cell, evidence, now, book))
  })

  it('judges answers after the new version by the new bar', () => {
    const now = new Date('2026-10-08T00:00:00Z')
    const raised: ThresholdBook = [
      ...book,
      threshold({ version: 2, effective_from: '2026-10-07T00:00:00Z', fluent_ms: 700 }),
    ]
    const late = [answer('2026-10-07T10:00:00Z', 1400)]
    expect(deriveState(cell, late, now, raised).fluency).toBeCloseTo(0.5)
  })
})

describe('separatingTime', () => {
  it('is the time that best separates sessions felt hard from the rest', () => {
    const t = separatingTime([
      obs(800, 'easy'),
      obs(1200, 'about_right'),
      obs(1500, 'about_right'),
      obs(2500, 'hard'),
      obs(3000, 'hard'),
    ])
    expect(t).toBe(2000)
  })

  it('tolerates a few contradicting ratings', () => {
    const t = separatingTime([
      obs(800, 'easy'),
      obs(1000, 'hard'),
      obs(1200, 'about_right'),
      obs(1400, 'easy'),
      obs(2600, 'hard'),
      obs(2800, 'hard'),
      obs(3000, 'easy'),
    ])
    expect(t).toBeGreaterThan(1400)
    expect(t).toBeLessThan(2600)
  })

  it('is unknown without both kinds of rating', () => {
    expect(separatingTime([obs(800, 'easy'), obs(900, 'about_right')])).toBeNull()
  })
})

describe('calibrate', () => {
  const prior = threshold({ fluent_ms: 1000 })
  const many = (count: number) =>
    Array.from({ length: count }, (_, i) => [
      obs(1500, 'easy', `s${i % 8}`),
      obs(2500, 'hard', `s${i % 8}`),
    ]).flat()

  it('keeps the current version until there are enough sessions from enough students', () => {
    expect(calibrate(prior, many(5), '2026-10-10T00:00:00Z')).toBe(prior)
    const fewStudents = Array.from({ length: 30 }, (_, i) =>
      obs(i % 2 ? 2500 : 1500, i % 2 ? 'hard' : 'easy', 'same'),
    )
    expect(calibrate(prior, fewStudents, '2026-10-10T00:00:00Z')).toBe(prior)
  })

  it('emits a new version, pulled toward the data the more sessions back it', () => {
    const some = calibrate(prior, many(10), '2026-10-10T00:00:00Z')
    const lots = calibrate(prior, many(200), '2026-10-10T00:00:00Z')
    expect(some).toMatchObject({
      version: 2,
      source: 'calibrated',
      effective_from: '2026-10-10T00:00:00Z',
      sessions: 20,
      students: 8,
    })
    expect(some.fluent_ms).toBeGreaterThan(1000)
    expect(some.fluent_ms).toBeLessThan(lots.fluent_ms)
    expect(lots.fluent_ms).toBeGreaterThan(1900)
  })
})
