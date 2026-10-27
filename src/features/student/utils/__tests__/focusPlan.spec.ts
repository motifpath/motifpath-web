import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import type { ItemOutcome } from '@/features/student/composables/usePracticeSessionRun'
import { planSections, planSubjects, reviewResult, subjectResults } from '@/features/student/utils/focusPlan'

type Item = components['schemas']['PracticeSessionItem']
type Plan = components['schemas']['PracticeSessionPlan']

const CHORDS = 'aaaaaaaa-0000-4000-8000-000000000001'
const NOTES = 'aaaaaaaa-0000-4000-8000-000000000002'
const OTHER = 'aaaaaaaa-0000-4000-8000-000000000003'
const CHILD = 'aaaaaaaa-0000-4000-8000-000000000004'

const names = (en: string) => ({ en, 'pt-BR': en })

function item(key: string, fields: Partial<Item> = {}): Item {
  return { item_key: key, kind: 'exercise', reason: 'new', rung: 'know', node_id: CHORDS, level: 'new', estimated_seconds: 30, ...fields }
}

function plan(items: Item[], fields: Partial<Plan> = {}): Plan {
  return {
    practice_session_id: 's-1',
    instrument_id: null,
    minutes: 10,
    focus_source: 'suggested',
    focus_nodes: [
      { node_id: CHORDS, names: names('Diatonic chords'), rung: 'know', rung_level: 'new' },
      { node_id: NOTES, names: names('Find notes'), rung: 'know', rung_level: 'new' },
    ],
    items,
    felt_questions: [],
    tap_check_due: false,
    ...fields,
  }
}

const right: ItemOutcome = { kind: 'answered', correct: true }
const wrong: ItemOutcome = { kind: 'answered', correct: false }

describe('planSubjects', () => {
  it('names each subject, main first, with the rungs its new items come from, lowest first', () => {
    const subjects = planSubjects(
      plan([
        item('a', { reason: 'new', rung: 'hear' }),
        item('b', { reason: 'stretch', rung: 'know' }),
        item('c', { reason: 'due', rung: 'play_clean' }),
        item('d', { node_id: NOTES, reason: 'new', rung: 'know' }),
      ]),
    )

    expect(subjects.map((s) => [s.node.node_id, s.rungs])).toEqual([
      [CHORDS, ['know', 'hear']],
      [NOTES, ['know']],
    ])
  })

  it("falls back on the rungs of all of a subject's items when none of them is new", () => {
    const subjects = planSubjects(plan([item('a', { reason: 'due', rung: 'hear' }), item('b', { reason: 'weak', rung: 'know' })]))

    expect(subjects[0].rungs).toEqual(['know', 'hear'])
  })

  it("counts a chosen subject's subtree as the subject", () => {
    const chosen = plan([item('a', { node_id: CHILD, rung: 'use' })], {
      focus_source: 'chosen',
      focus_nodes: [{ node_id: CHORDS, names: names('Common progressions'), rung: 'know', rung_level: 'new' }],
    })

    expect(planSubjects(chosen)[0].rungs).toEqual(['use'])
  })
})

describe('planSections', () => {
  it("puts the warm-up first, then other subjects' due items as the review block, then the subjects", () => {
    const sections = planSections(
      plan([
        item('warm', { reason: 'warm_up', node_id: OTHER }),
        item('r1', { reason: 'due', node_id: OTHER }),
        item('r2', { reason: 'due', node_id: null }),
        item('s1', { reason: 'due' }),
        item('s2', { reason: 'new', node_id: NOTES }),
      ]),
    )

    expect(sections).toEqual([
      { kind: 'warm_up', positions: [0] },
      { kind: 'review', positions: [1, 2] },
      { kind: 'subjects', positions: [3, 4] },
    ])
  })

  it('leaves out a section with nothing in it', () => {
    expect(planSections(plan([item('s1')]))).toEqual([{ kind: 'subjects', positions: [0] }])
  })

  it("has no review block in a chosen session: due items of the subject's subtree are the subject's", () => {
    const chosen = plan([item('a', { reason: 'due', node_id: CHILD }), item('b')], {
      focus_source: 'chosen',
      focus_nodes: [{ node_id: CHORDS, names: names('Common progressions'), rung: 'know', rung_level: 'new' }],
    })

    expect(planSections(chosen)).toEqual([{ kind: 'subjects', positions: [0, 1] }])
  })
})

describe('subjectResults', () => {
  it("scores each subject on its answered items, with the rungs they practised, in the plan's subject order", () => {
    const items = [
      item('warm', { reason: 'warm_up', node_id: OTHER }),
      item('a', { node_id: NOTES, rung: 'know' }),
      item('b', { rung: 'hear' }),
      item('c', { rung: 'know' }),
      item('d', { rung: 'know' }),
    ]
    const outcomes = new Map<number, ItemOutcome>([
      [0, right],
      [1, right],
      [2, wrong],
      [3, right],
    ])

    expect(subjectResults(plan(items), outcomes).map((r) => [r.node.node_id, r.right, r.answered, r.rungs])).toEqual([
      [CHORDS, 1, 2, ['know', 'hear']],
      [NOTES, 1, 1, ['know']],
    ])
  })

  it('counts a played, rated or counted item right only when it went clean', () => {
    const items = [item('p', { kind: 'play_along' }), item('r', { kind: 'chord_voicing' }), item('c', { kind: 'chord_change' })]
    const outcomes = new Map<number, ItemOutcome>([
      [0, { kind: 'played', takes: [{ bpm: 70, rating: 'almost' }, { bpm: 72, rating: 'clean' }] }],
      [1, { kind: 'rated', rating: 'almost' }],
      [2, { kind: 'changes', tempoBpm: 60, cleanChanges: 55, rating: 'clean' }],
    ])

    expect(subjectResults(plan(items), outcomes)[0]).toMatchObject({ right: 2, answered: 3 })
  })

  it('counts a progression key tour right when one of its takes went clean', () => {
    const items = [item('t1', { kind: 'progression_keys' }), item('t2', { kind: 'progression_keys' })]
    const outcomes = new Map<number, ItemOutcome>([
      [0, { kind: 'toured', takes: [{ bpm: 60, rating: 'struggled' }, { bpm: 55, rating: 'clean' }], cleanKeys: 1, tourBpm: 55 }],
      [1, { kind: 'toured', takes: [{ bpm: 60, rating: 'almost' }], cleanKeys: 0, tourBpm: 60 }],
    ])

    expect(subjectResults(plan(items), outcomes)[0]).toMatchObject({ right: 1, answered: 2 })
  })

  it('counts a guide tone right when one of its takes hit every bar', () => {
    const items = [item('g1', { kind: 'guide_tone' }), item('g2', { kind: 'guide_tone' })]
    const outcomes = new Map<number, ItemOutcome>([
      [0, { kind: 'tapped', hits: 4, bars: 4, correct: true }],
      [1, { kind: 'tapped', hits: 3, bars: 4, correct: false }],
    ])

    expect(subjectResults(plan(items), outcomes)[0]).toMatchObject({ right: 1, answered: 2 })
  })

  it('leaves out a subject with nothing answered', () => {
    const results = subjectResults(plan([item('a'), item('b', { node_id: NOTES })]), new Map([[0, right]]))

    expect(results.map((r) => r.node.node_id)).toEqual([CHORDS])
  })
})

describe('reviewResult', () => {
  it('scores the review block on its answered items', () => {
    const items = [item('r1', { reason: 'due', node_id: OTHER }), item('r2', { reason: 'due', node_id: OTHER }), item('s')]
    const outcomes = new Map<number, ItemOutcome>([
      [0, right],
      [1, wrong],
      [2, right],
    ])

    expect(reviewResult(plan(items), outcomes)).toEqual({ right: 1, answered: 2 })
  })

  it('is null when nothing in the review block was answered', () => {
    expect(reviewResult(plan([item('r1', { reason: 'due', node_id: OTHER })]), new Map())).toBeNull()
  })
})
