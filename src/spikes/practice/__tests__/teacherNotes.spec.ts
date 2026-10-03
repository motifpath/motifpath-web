import { describe, expect, it } from 'vitest'

import type { GraphNode, KnowledgeState, Level, PracticeItem, TeacherNote } from '@/spikes/practice/model'
import { openSuggestions } from '@/spikes/practice/teacherNotes'

const NOW = new Date('2026-10-20T09:00:00Z')
const DAY_MS = 86_400_000
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY_MS).toISOString()

const nodes: GraphNode[] = [
  { node_id: 'picking', key: 'picking', kind: 'skill', name: 'Picking', parent_id: null, instrument_ids: [], map_level: null },
  { node_id: 'empty', key: 'empty', kind: 'concept', name: 'Empty', parent_id: null, instrument_ids: [], map_level: null },
]

const item: PracticeItem = {
  kind: 'play_along',
  item_key: 'drill',
  label: 'drill',
  skill_ids: ['picking'],
  concept_ids: [],
  diagram_id: 'd',
  purpose: 'technique',
  params: { start_bpm: 60, target_bpm: 120, step_bpm: 5, cleans_to_advance: 2, loops: 2, count_in_beats: 4 },
}

/** The drill at a level, last practised a day ago (after the default note). */
function at(level: Level, lastSeen = daysAgo(1)): Map<string, KnowledgeState> {
  return new Map([
    [
      'drill',
      {
        item_key: 'drill',
        attempts: 5,
        accuracy: 0.9,
        fluency: 0.9,
        box: 2,
        last_seen_at: lastSeen,
        due_at: null,
        level,
        effective_level: level,
        fading: false,
        verified: false,
        median_latency_ms: null,
        best_clean_bpm: null,
        best_changes_per_minute: null,
      },
    ],
  ])
}

function note(overrides: Partial<TeacherNote>): TeacherNote {
  return {
    teacher_note_id: 'n1',
    student_id: 's',
    teacher_id: 't',
    created_at: daysAgo(2),
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

const ctx = (states: Map<string, KnowledgeState>) => ({ nodes, items: [item], states, now: NOW })

describe('openSuggestions', () => {
  it('keeps a suggested item open while it is below the level the teacher asked for', () => {
    const open = openSuggestions([note({ suggested_item_keys: ['drill'] })], ctx(at('learning')))
    expect(open.item_keys).toEqual(['drill'])
  })

  it('ends a suggested item once it reaches that level', () => {
    const open = openSuggestions([note({ suggested_item_keys: ['drill'] })], ctx(at('accurate')))
    expect(open.item_keys).toEqual([])
  })

  it('does not end before the student has practised it since the note', () => {
    const open = openSuggestions([note({ suggested_item_keys: ['drill'] })], ctx(at('fluent', daysAgo(3))))
    expect(open.item_keys).toEqual(['drill'])
  })

  it('measures the goal at the level the teacher picked', () => {
    const open = openSuggestions(
      [note({ suggested_item_keys: ['drill'], target_level: 'fluent' })],
      ctx(at('accurate')),
    )
    expect(open.item_keys).toEqual(['drill'])
  })

  it('ends a skill to work on once the node reaches the level', () => {
    const flagged = note({ needs_work: { skill_ids: ['picking'], concept_ids: [] } })
    expect(openSuggestions([flagged], ctx(at('learning'))).node_ids).toEqual(['picking'])
    expect(openSuggestions([flagged], ctx(at('accurate'))).node_ids).toEqual([])
  })

  it('keeps a node with nothing to practise open until the note ends otherwise', () => {
    const open = openSuggestions([note({ needs_work: { skill_ids: [], concept_ids: ['empty'] } })], ctx(new Map()))
    expect(open.node_ids).toEqual(['empty'])
  })

  it('steers nothing once the teacher closes the note', () => {
    const open = openSuggestions(
      [note({ suggested_item_keys: ['drill'], closed_at: daysAgo(1) })],
      ctx(at('learning')),
    )
    expect(open.item_keys).toEqual([])
  })

  it('steers nothing after the 30-day safety expiry', () => {
    const fresh = note({ suggested_item_keys: ['drill'], created_at: daysAgo(29) })
    const stale = note({ suggested_item_keys: ['drill'], created_at: daysAgo(31) })
    expect(openSuggestions([fresh], ctx(at('learning'))).item_keys).toEqual(['drill'])
    expect(openSuggestions([stale], ctx(at('learning'))).item_keys).toEqual([])
  })

  it('lists each open item or node once across notes', () => {
    const open = openSuggestions(
      [note({ suggested_item_keys: ['drill'] }), note({ teacher_note_id: 'n2', suggested_item_keys: ['drill'] })],
      ctx(at('new')),
    )
    expect(open.item_keys).toEqual(['drill'])
  })
})
