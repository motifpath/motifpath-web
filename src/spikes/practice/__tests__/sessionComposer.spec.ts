import { describe, expect, it } from 'vitest'

import type {
  KnowledgeState,
  PlayAlongItem,
  PracticeItem,
  Session,
  GraphNode,
  TeacherNote,
} from '@/spikes/practice/model'
import { composeSession } from '@/spikes/practice/sessionComposer'
import type { ComposeInput } from '@/spikes/practice/sessionComposer'

const NOW = new Date('2026-10-20T09:00:00Z')
const PAST = '2026-10-10T09:00:00Z'
const FUTURE = '2026-10-25T09:00:00Z'

const GUITAR = 'guitar'

function node(id: string, parent: string | null): GraphNode {
  return { node_id: id, key: id, kind: 'skill', name: id, parent_id: parent, instrument_ids: [], map_level: null }
}

const nodes: GraphNode[] = [
  node('fretboard', null),
  node('string-6', 'fretboard'),
  node('off-path', null),
  node('picking', null),
  node('chords', null),
]

function cell(i: number, skill = 'string-6'): PracticeItem {
  return {
    kind: 'fretboard_cell',
    item_key: `cell-${i}`,
    label: `cell ${i}`,
    skill_ids: [skill],
    concept_ids: [],
    instrument_id: 'g',
    string: 6,
    fret: i,
    note_name: 'E',
  }
}

function playAlong(key: string, purpose: PlayAlongItem['purpose'], skill = 'picking'): PlayAlongItem {
  return {
    kind: 'play_along',
    item_key: key,
    label: key,
    skill_ids: [skill],
    concept_ids: [],
    diagram_id: 'd',
    purpose,
    params: { start_bpm: 60, target_bpm: 120, step_bpm: 5, cleans_to_advance: 2, loops: 4, count_in_beats: 4 },
  }
}

function seen(key: string, overrides: Partial<KnowledgeState>): KnowledgeState {
  return {
    item_key: key,
    attempts: 5,
    accuracy: 0.9,
    fluency: 0.9,
    box: 2,
    last_seen_at: PAST,
    due_at: FUTURE,
    level: 'accurate',
    effective_level: 'accurate',
    fading: false,
    verified: false,
    median_latency_ms: 1500,
    best_clean_bpm: null,
    best_changes_per_minute: null,
    ...overrides,
  }
}

function note(overrides: Partial<TeacherNote>): TeacherNote {
  return {
    teacher_note_id: 'n1',
    student_id: 's',
    teacher_id: 't',
    created_at: PAST,
    take_id: null,
    item_key: null,
    rating: null,
    bpm: null,
    verified: false,
    rubric: {},
    comments: [],
    summary: '',
    needs_work: { skill_ids: [], concept_ids: [] },
    suggested_item_keys: [],
    target_level: 'accurate',
    closed_at: null,
    ...overrides,
  }
}

function input(overrides: Partial<ComposeInput>): ComposeInput {
  return {
    session_id: 'session',
    student_id: 's',
    now: NOW,
    items: [],
    states: new Map(),
    graph: { nodes, edges: [] },
    instrument_id: GUITAR,
    path_skill_ids: ['fretboard', 'picking', 'chords'],
    teacher_notes: [],
    instrument_in_hand: false,
    minutes: 5,
    seed: 7,
    ...overrides,
  }
}

const entries = (s: Session) => s.blocks.flatMap((b) => b.entries)

describe('composeSession — away from the instrument', () => {
  // 0–9 due, 10–19 weak (seen, not due), 20–29 never seen
  const items = Array.from({ length: 30 }, (_, i) => cell(i))
  const states = new Map<string, KnowledgeState>()
  for (let i = 0; i < 10; i++) states.set(`cell-${i}`, seen(`cell-${i}`, { due_at: PAST }))
  for (let i = 10; i < 20; i++) states.set(`cell-${i}`, seen(`cell-${i}`, { accuracy: 0.5, level: 'learning' }))

  it('is one mental block that fills the time, roughly due 60 / weak 25 / new 15', () => {
    const s = composeSession(input({ items, states, minutes: 2 }))
    expect(s.blocks.map((b) => b.kind)).toEqual(['mental'])
    const reasons = entries(s).map((e) => e.reason)
    expect(reasons).toHaveLength(12)
    const count = (r: string) => reasons.filter((x) => x === r).length
    expect(count('due')).toBe(7)
    expect(count('weak')).toBe(3)
    expect(count('new')).toBe(2)
  })

  it('never brings the same item twice', () => {
    const keys = entries(composeSession(input({ items, states, minutes: 5 }))).map((e) => e.item_key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('leaves out items the instrument is needed for', () => {
    const s = composeSession(input({ items: [...items, playAlong('drill', 'technique')], states }))
    expect(entries(s).map((e) => e.item_key)).not.toContain('drill')
  })

  it('leaves out skills the student has not met on the path', () => {
    const s = composeSession(input({ items: [...items, cell(99, 'off-path')], states }))
    expect(entries(s).map((e) => e.item_key)).not.toContain('cell-99')
  })

  it('brings what the teacher suggested first, even off the path', () => {
    const s = composeSession(
      input({
        items: [...items, cell(99, 'off-path')],
        states,
        teacher_notes: [note({ suggested_item_keys: ['cell-99'] })],
      }),
    )
    expect(entries(s)).toContainEqual({ item_key: 'cell-99', reason: 'teacher_suggested' })
  })

  it('is the same session for the same seed', () => {
    const a = composeSession(input({ items, states }))
    const b = composeSession(input({ items, states }))
    expect(a).toEqual(b)
  })
})

describe('composeSession — instrument in hand', () => {
  const items: PracticeItem[] = [
    playAlong('known', 'technique'),
    playAlong('shaky', 'technique'),
    playAlong('fresh', 'technique'),
    playAlong('riff', 'repertoire'),
    cell(1),
  ]
  const states = new Map([
    ['known', seen('known', { fluency: 0.95, level: 'fluent' })],
    ['shaky', seen('shaky', { fluency: 0.4, accuracy: 0.5, level: 'learning' })],
  ])

  it('5 minutes: a warm-up on something known, then one focus item', () => {
    const s = composeSession(input({ items, states, instrument_in_hand: true, minutes: 5 }))
    expect(s.blocks).toEqual([
      { kind: 'warm_up', entries: [{ item_key: 'known', reason: 'warm_up' }] },
      { kind: 'focus', entries: [{ item_key: 'shaky', reason: 'weak' }] },
    ])
  })

  it('3 minutes: no time for a warm-up — straight to the focus item', () => {
    const s = composeSession(input({ items, states, instrument_in_hand: true, minutes: 3 }))
    expect(s.blocks).toEqual([{ kind: 'focus', entries: [{ item_key: 'shaky', reason: 'weak' }] }])
  })

  it('15 minutes: warm-up, focus, then applying it to music', () => {
    const s = composeSession(input({ items, states, instrument_in_hand: true, minutes: 15 }))
    expect(s.blocks.map((b) => b.kind)).toEqual(['warm_up', 'focus', 'application'])
    expect(s.blocks[2]!.entries).toEqual([{ item_key: 'riff', reason: 'application' }])
    expect(s.blocks[1]!.entries.map((e) => e.item_key)).toEqual(['shaky', 'fresh'])
  })

  it('never warms up on something the teacher flagged — that belongs in focus', () => {
    const s = composeSession(
      input({ items, states, instrument_in_hand: true, minutes: 5, teacher_notes: [note({ suggested_item_keys: ['known'] })] }),
    )
    expect(s.blocks[0]!.entries[0]!.item_key).not.toBe('known')
    expect(s.blocks[1]!.entries[0]).toEqual({ item_key: 'known', reason: 'teacher_suggested' })
  })

  it('a skill the teacher flagged comes first in the focus block', () => {
    const flagged = playAlong('flagged', 'technique', 'chords')
    const s = composeSession(
      input({
        items: [...items, flagged],
        states,
        instrument_in_hand: true,
        minutes: 5,
        teacher_notes: [note({ needs_work: { skill_ids: ['chords'], concept_ids: [] } })],
      }),
    )
    expect(s.blocks[1]!.entries[0]).toEqual({ item_key: 'flagged', reason: 'teacher_suggested' })
  })
})

describe('composeSession — caught up: review ahead, then stretch', () => {
  // On the path and all seen, fluent, not yet due: nothing due, weak or new.
  const known = [0, 1, 2, 3].map((i) => cell(i))
  const dueAt = ['2026-10-25', '2026-10-22', '2026-10-30', '2026-11-05']
  const states = new Map(
    known.map((c, i) => [
      c.item_key,
      seen(c.item_key, { level: 'fluent', effective_level: 'fluent', due_at: `${dueAt[i]}T09:00:00Z` }),
    ]),
  )
  const stretchNodes: GraphNode[] = [
    { ...node('power-chords', null), map_level: 'B' },
    { ...node('top-strings', null), map_level: 'EI' },
    { ...node('advanced', null), map_level: 'I' },
    node('blocked', null),
    { ...node('bass-only', null), instrument_ids: ['bass'] },
  ]
  const graph = {
    nodes: [...nodes, ...stretchNodes],
    edges: [
      { from_id: 'power-chords', to_id: 'string-6', type: 'requires' as const, level: 'accurate' as const },
      { from_id: 'blocked', to_id: 'chords', type: 'requires' as const, level: 'fluent' as const },
    ],
  }
  const offPath = [
    cell(10, 'top-strings'),
    cell(11, 'top-strings'),
    cell(20, 'power-chords'),
    cell(30, 'blocked'),
    cell(40, 'bass-only'),
    cell(50, 'advanced'),
  ]
  const items = [...known, ...offPath]
  const pick = (s: Session, reason: string) =>
    entries(s)
      .filter((e) => e.reason === reason)
      .map((e) => e.item_key)

  it('reviews ahead the items coming due soonest', () => {
    const s = composeSession(input({ items, states, graph, minutes: 1 }))
    expect(pick(s, 'review_ahead').sort()).toEqual(['cell-0', 'cell-1', 'cell-2'])
  })

  it('stretches into ready nodes off the path, those building on what the student has first', () => {
    const s = composeSession(input({ items, states, graph, minutes: 1 }))
    expect(pick(s, 'stretch').sort()).toEqual(['cell-10', 'cell-11', 'cell-20'])
    expect(entries(s)).toContainEqual({ item_key: 'cell-20', reason: 'stretch', node_id: 'power-chords' })
  })

  it('never stretches into a node whose requirements are not met', () => {
    const s = composeSession(input({ items, states, graph, minutes: 10 }))
    expect(pick(s, 'stretch')).not.toContain('cell-30')
    expect(pick(s, 'stretch')).toContain('cell-50')
  })

  it('never stretches into a node that is not for the student’s instrument', () => {
    const s = composeSession(input({ items, states, graph, minutes: 10 }))
    expect(pick(s, 'stretch')).not.toContain('cell-40')
  })

  it('lets stretch fill the time once nothing is left to review ahead', () => {
    const s = composeSession(input({ items, states, graph, minutes: 10 }))
    expect(pick(s, 'review_ahead')).toHaveLength(4)
    expect(pick(s, 'stretch')).toHaveLength(4)
  })

  it('instrument in hand: a focus block with nothing due takes a stretch item', () => {
    const power = playAlong('power', 'technique', 'power-chords')
    const s = composeSession(
      input({
        items: [...known, playAlong('known-drill', 'technique'), power],
        states: new Map([...states, ['known-drill', seen('known-drill', { level: 'fluent', fluency: 0.95 })]]),
        graph,
        instrument_in_hand: true,
        minutes: 5,
      }),
    )
    expect(s.blocks).toEqual([
      { kind: 'warm_up', entries: [{ item_key: 'known-drill', reason: 'warm_up' }] },
      { kind: 'focus', entries: [{ item_key: 'power', reason: 'stretch', node_id: 'power-chords' }] },
    ])
  })
})
