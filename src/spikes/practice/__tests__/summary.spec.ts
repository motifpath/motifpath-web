import { describe, expect, it } from 'vitest'

import type { Evidence, GraphNode, KnowledgeGraph, KnowledgeState, PracticeItem } from '@/spikes/practice/model'
import { summarize } from '@/spikes/practice/summary'
import type { SummaryInput } from '@/spikes/practice/summary'

const NOW = new Date('2026-10-20T09:00:00Z')
const DAY_MS = 86_400_000
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY_MS).toISOString()

function node(id: string, parent: string | null, kind: GraphNode['kind'] = 'skill', instruments: string[] = []): GraphNode {
  return { node_id: id, key: id, kind, name: id, parent_id: parent, instrument_ids: instruments, map_level: null }
}

const graph: KnowledgeGraph = {
  nodes: [
    node('fretboard', null),
    node('root-strings', 'fretboard'),
    node('top-strings', 'fretboard'),
    node('chords', null),
    node('power-chords', 'chords'),
    node('barre', 'chords'),
    node('bass-lines', null, 'skill', ['bass']),
    node('notes', null, 'concept'),
    node('note-names', 'notes', 'concept'),
  ],
  edges: [
    { from_id: 'power-chords', to_id: 'root-strings', type: 'requires', level: 'accurate' },
    { from_id: 'barre', to_id: 'top-strings', type: 'requires', level: 'accurate' },
  ],
}

function cell(key: string, skill: string, concepts: string[] = []): PracticeItem {
  return {
    kind: 'fretboard_cell',
    item_key: key,
    label: key,
    skill_ids: [skill],
    concept_ids: concepts,
    instrument_id: 'guitar',
    string: 6,
    fret: 0,
    note_name: 'E',
  }
}

const items: PracticeItem[] = [
  cell('r1', 'root-strings', ['note-names']),
  cell('r2', 'root-strings', ['note-names']),
  cell('t1', 'top-strings', ['note-names']),
  cell('p1', 'power-chords'),
  cell('b1', 'barre'),
  cell('l1', 'bass-lines'),
]

function state(key: string, overrides: Partial<KnowledgeState>): KnowledgeState {
  return {
    item_key: key,
    attempts: 5,
    accuracy: 0.9,
    fluency: 0.8,
    box: 2,
    last_seen_at: daysAgo(1),
    due_at: null,
    level: 'accurate',
    effective_level: 'accurate',
    fading: false,
    verified: false,
    median_latency_ms: null,
    best_clean_bpm: null,
    best_changes_per_minute: null,
    ...overrides,
  }
}

function answerOn(day: number): Evidence {
  return {
    evidence_id: `e${day}-${Math.random()}`,
    student_id: 's',
    item_key: 'r1',
    occurred_at: daysAgo(day),
    session_id: null,
    source: 'auto_graded',
    correct: true,
    latency_ms: 1000,
    grader: 'fretboard_cell.v1',
    response: { kind: 'name_the_note', chosen_note: 'E', latency_ms: 1000 },
  }
}

function input(overrides: Partial<SummaryInput>): SummaryInput {
  return {
    graph,
    items,
    instrument_id: 'guitar',
    now: NOW,
    states_now: new Map(),
    states_week_ago: new Map(),
    evidence: [],
    ...overrides,
  }
}

describe('summarize', () => {
  it('counts the days practised in the last seven, never a streak', () => {
    const evidence = [answerOn(0.1), answerOn(0.2), answerOn(2), answerOn(6), answerOn(8)]
    expect(summarize(input({ evidence })).practice_days_last_7).toBe(3)
  })

  it('reports this week’s progress per node with both values, biggest gain first', () => {
    const s = summarize(
      input({
        states_week_ago: new Map([
          ['r1', state('r1', { accuracy: 0.6 })],
          ['r2', state('r2', { accuracy: 0.6 })],
          ['t1', state('t1', { accuracy: 0.8 })],
        ]),
        states_now: new Map([
          ['r1', state('r1', { accuracy: 0.9 })],
          ['r2', state('r2', { accuracy: 0.9 })],
          ['t1', state('t1', { accuracy: 0.85 })],
        ]),
      }),
    )
    expect(s.progress.map((p) => p.node_id)).toEqual(['root-strings', 'note-names', 'top-strings'])
    expect(s.progress[0]).toMatchObject({ node_id: 'root-strings', from: { accuracy: 0.6 }, to: { accuracy: 0.9 } })
  })

  it('counts newly started items as progress in coverage', () => {
    const s = summarize(input({ states_now: new Map([['p1', state('p1', {})]]) }))
    expect(s.progress).toContainEqual(
      expect.objectContaining({ node_id: 'power-chords', from: expect.objectContaining({ met: 0 }), to: expect.objectContaining({ met: 1 }) }),
    )
  })

  it('leaves out nodes that did not change', () => {
    const same = new Map([['r1', state('r1', {})]])
    expect(summarize(input({ states_week_ago: same, states_now: same })).progress).toEqual([])
  })

  it('frames gaps as next steps: items to refresh and weak spots, by node', () => {
    const s = summarize(
      input({
        states_now: new Map([
          ['r1', state('r1', { fading: true })],
          ['r2', state('r2', { fading: true })],
          ['t1', state('t1', { level: 'learning', effective_level: 'learning' })],
        ]),
      }),
    )
    expect(s.opportunities).toContainEqual({ kind: 'refresh', node_id: 'root-strings', count: 2 })
    expect(s.opportunities).toContainEqual({ kind: 'strengthen', node_id: 'top-strings', count: 1 })
  })

  it('suggests starting nodes the student is ready for on their instrument', () => {
    const s = summarize(
      input({
        states_now: new Map([
          ['r1', state('r1', {})],
          ['r2', state('r2', {})],
        ]),
      }),
    )
    const ready = s.opportunities.filter((o) => o.kind === 'start').map((o) => o.node_id)
    expect(ready).toContain('power-chords')
    expect(ready).not.toContain('barre')
    expect(ready).not.toContain('bass-lines')
  })

  it('groups practice nodes under their area, never giving the area a single level', () => {
    const s = summarize(input({ states_now: new Map([['r1', state('r1', {})]]) }))
    const fretboard = s.areas.find((a) => a.node_id === 'fretboard')!
    expect(fretboard.nodes.map((n) => n.node_id)).toEqual(['root-strings', 'top-strings'])
    expect(fretboard.nodes[0]).toMatchObject({ met: 1, total: 2 })
    expect(fretboard).not.toHaveProperty('level')
    expect(s.areas.map((a) => a.node_id)).not.toContain('bass-lines')
  })
})
