import { describe, expect, it } from 'vitest'

import { descendantIds, nodeLevel, readiness, rollup } from '@/spikes/practice/graph'
import type { GraphEdge, GraphNode, KnowledgeGraph, KnowledgeState, Level, PracticeItem } from '@/spikes/practice/model'

const GUITAR = 'guitar'
const BASS = 'bass'

function node(id: string, parent: string | null, instruments: string[] = []): GraphNode {
  return { node_id: id, key: id, kind: 'skill', name: id, parent_id: parent, instrument_ids: instruments, map_level: null }
}

const nodes: GraphNode[] = [
  node('fretboard', null),
  node('root-strings', 'fretboard'),
  node('top-strings', 'fretboard'),
  node('picking', null),
  node('pentatonic', null),
  node('open-chords', null),
  node('bass-clef', null, [BASS]),
]

function cell(key: string, skill: string): PracticeItem {
  return {
    kind: 'fretboard_cell',
    item_key: key,
    label: key,
    skill_ids: [skill],
    concept_ids: [],
    instrument_id: 'g',
    string: 6,
    fret: 0,
    note_name: 'E',
  }
}

function state(key: string, overrides: Partial<KnowledgeState>): KnowledgeState {
  return {
    item_key: key,
    attempts: 1,
    accuracy: 1,
    fluency: 1,
    box: 1,
    last_seen_at: null,
    due_at: null,
    level: 'learning',
    effective_level: 'learning',
    fading: false,
    verified: false,
    median_latency_ms: null,
    best_clean_bpm: null,
    best_changes_per_minute: null,
    ...overrides,
  }
}

/** States where each listed item shows the given level now. */
function statesAt(levels: Record<string, Level>): Map<string, KnowledgeState> {
  return new Map(
    Object.entries(levels).map(([key, level]) => [key, state(key, { level, effective_level: level })]),
  )
}

describe('descendantIds', () => {
  it('includes the node itself and its whole subtree', () => {
    expect(descendantIds(nodes, 'fretboard').sort()).toEqual(['fretboard', 'root-strings', 'top-strings'])
    expect(descendantIds(nodes, 'picking')).toEqual(['picking'])
  })
})

describe('rollup', () => {
  const items = [cell('a', 'root-strings'), cell('b', 'root-strings'), cell('c', 'top-strings'), cell('d', 'picking')]
  const states = new Map([
    ['a', state('a', { effective_level: 'fluent', fluency: 1 })],
    ['b', state('b', { effective_level: 'learning', fluency: 0.4, fading: true })],
  ])

  it('counts the subtree items by the level they show now, unseen ones as new', () => {
    const r = rollup(nodes, items, states, 'fretboard')
    expect(r.total).toBe(3)
    expect(r.by_level).toEqual({ new: 1, learning: 1, accurate: 0, fluent: 1, retained: 0 })
    expect(r.fading).toBe(1)
  })

  it('averages fluency over seen items only', () => {
    expect(rollup(nodes, items, states, 'root-strings').mean_fluency).toBeCloseTo(0.7)
  })
})

describe('nodeLevel', () => {
  const five = ['a', 'b', 'c', 'd', 'e'].map((k) => cell(k, 'root-strings'))

  it('is the highest level that at least 80% of its items reach', () => {
    const states = statesAt({ a: 'fluent', b: 'fluent', c: 'fluent', d: 'retained', e: 'learning' })
    expect(nodeLevel(nodes, five, states, 'root-strings')).toBe('fluent')
  })

  it('drops to the level the 80% share still reaches when too many lag behind', () => {
    const states = statesAt({ a: 'fluent', b: 'fluent', c: 'fluent', d: 'learning', e: 'learning' })
    expect(nodeLevel(nodes, five, states, 'root-strings')).toBe('learning')
  })

  it('counts unseen items as new, so a barely covered node stays new', () => {
    const states = statesAt({ a: 'retained' })
    expect(nodeLevel(nodes, five, states, 'root-strings')).toBe('new')
  })

  it('uses the level shown now, so a lapsed item pulls its node down', () => {
    const states = new Map(
      five.map((i) => [i.item_key, state(i.item_key, { level: 'fluent', effective_level: 'accurate' })]),
    )
    expect(nodeLevel(nodes, five, states, 'root-strings')).toBe('accurate')
  })

  it('has no level when nothing under the node can be practised', () => {
    expect(nodeLevel(nodes, five, new Map(), 'open-chords')).toBeNull()
  })

  it('rolls a parent up over every item in its subtree, each counted once', () => {
    const items = [...five, cell('t', 'top-strings')]
    const states = statesAt({ a: 'fluent', b: 'fluent', c: 'fluent', d: 'fluent', e: 'fluent', t: 'learning' })
    // 5 of 6 fluent is 83%: the parent is fluent even though one child is learning.
    expect(nodeLevel(nodes, items, states, 'fretboard')).toBe('fluent')
    expect(nodeLevel(nodes, items, states, 'top-strings')).toBe('learning')
  })
})

describe('readiness', () => {
  const requires = (from: string, to: string, level: GraphEdge['level']): GraphEdge => ({
    from_id: from,
    to_id: to,
    type: 'requires',
    level,
  })
  const graph: KnowledgeGraph = {
    nodes,
    edges: [
      requires('pentatonic', 'picking', 'accurate'),
      requires('pentatonic', 'root-strings', 'fluent'),
      requires('pentatonic', 'open-chords', 'accurate'),
      requires('pentatonic', 'bass-clef', 'accurate'),
      { from_id: 'pentatonic', to_id: 'top-strings', type: 'applies', level: null },
    ],
  }
  const items = [cell('p', 'picking'), cell('r', 'root-strings')]

  it('counts a requirement as met once the required node reaches the level asked for', () => {
    const r = readiness(graph, items, statesAt({ p: 'fluent', r: 'fluent' }), 'pentatonic', GUITAR)
    expect(r.met).toBe(2)
    expect(r.total).toBe(3)
  })

  it('lists what is missing with the level needed and the level reached', () => {
    const r = readiness(graph, items, statesAt({ p: 'accurate', r: 'accurate' }), 'pentatonic', GUITAR)
    expect(r.missing).toEqual([
      { node_id: 'root-strings', needed: 'fluent', has: 'accurate' },
      { node_id: 'open-chords', needed: 'accurate', has: null },
    ])
  })

  it('counts a required node with nothing to practise as not met', () => {
    const r = readiness(graph, items, statesAt({ p: 'retained', r: 'retained' }), 'pentatonic', GUITAR)
    expect(r.met).toBe(2)
    expect(r.missing.map((m) => m.node_id)).toEqual(['open-chords'])
  })

  it('ignores requirements on nodes that are not for the student’s instrument', () => {
    expect(readiness(graph, items, new Map(), 'pentatonic', GUITAR).total).toBe(3)
    expect(readiness(graph, items, new Map(), 'pentatonic', BASS).total).toBe(4)
  })

  it('ignores applies links', () => {
    const r = readiness(graph, items, new Map(), 'pentatonic', GUITAR)
    expect(r.missing.map((m) => m.node_id)).not.toContain('top-strings')
  })
})
