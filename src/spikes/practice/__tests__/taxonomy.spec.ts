import { describe, expect, it } from 'vitest'

import type { KnowledgeState, PracticeItem, TaxonomyNode } from '@/spikes/practice/model'
import { descendantIds, rollup } from '@/spikes/practice/taxonomy'

const tree: TaxonomyNode[] = [
  { id: 'fretboard', name: 'Fretboard', parent_id: null },
  { id: 'string-6', name: 'String 6', parent_id: 'fretboard' },
  { id: 'string-5', name: 'String 5', parent_id: 'fretboard' },
  { id: 'picking', name: 'Picking', parent_id: null },
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

describe('descendantIds', () => {
  it('includes the node itself and its whole subtree', () => {
    expect(descendantIds(tree, 'fretboard').sort()).toEqual(['fretboard', 'string-5', 'string-6'])
    expect(descendantIds(tree, 'picking')).toEqual(['picking'])
  })
})

describe('rollup', () => {
  const items = [cell('a', 'string-6'), cell('b', 'string-6'), cell('c', 'string-5'), cell('d', 'picking')]
  const states = new Map([
    ['a', state('a', { effective_level: 'fluent', fluency: 1 })],
    ['b', state('b', { effective_level: 'learning', fluency: 0.4, fading: true })],
  ])

  it('counts the subtree items by the level they show now, unseen ones as new', () => {
    const r = rollup(tree, items, states, 'fretboard')
    expect(r.total).toBe(3)
    expect(r.by_level).toEqual({ new: 1, learning: 1, accurate: 0, fluent: 1, retained: 0 })
    expect(r.fading).toBe(1)
  })

  it('averages fluency over seen items only', () => {
    expect(rollup(tree, items, states, 'string-6').mean_fluency).toBeCloseTo(0.7)
  })
})
