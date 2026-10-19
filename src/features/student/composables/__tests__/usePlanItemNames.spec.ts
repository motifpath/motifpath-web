import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { usePlanItemNames } from '@/features/student/composables/usePlanItemNames'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

const DIAGRAM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const playAlong: Item = {
  item_key: `play_along:${DIAGRAM}`,
  kind: 'play_along',
  rung: 'play_in_time',
  reason: 'stretch',
  node_id: null,
  level: 'new',
  estimated_seconds: 60,
  play_along: {
    diagram_id: DIAGRAM,
    start_tempo_bpm: 60,
    start_note_value: 'quarters',
    target_tempo_bpm: 100,
    best_clean_tempo_bpm: null,
    best_clean_note_value: null,
  },
}

const exercise: Item = {
  item_key: 'exercise:e1',
  kind: 'exercise',
  rung: 'know',
  reason: 'weak',
  node_id: null,
  level: 'learning',
  estimated_seconds: 30,
  exercise: {
    exercise_id: 'e1',
    title: 'Name the interval',
    prompt: plainTextPrompt('Which interval is this?'),
    exercise_type: 'text_response',
    options: [{ option_id: 'right', is_correct: true, label: 'Minor third' }],
    challenge_ids: [],
    content_node_ids: [],
    skills: [],
    concepts: [],
    remediation_targets: [],
    languages: [{ code: 'en', name: 'English' }],
    instrument_ids: [],
    created_at: '2026-10-06T00:00:00Z',
    updated_at: '2026-10-06T00:00:00Z',
  },
}

const cell: Item = {
  item_key: 'fretboard_cell:6ea2d087-ab9c-59dc-9657-8546025414d2:5:3',
  kind: 'fretboard_cell',
  rung: 'know',
  reason: 'new',
  node_id: null,
  level: 'new',
  estimated_seconds: 8,
  fretboard_cell: { layout_instrument_id: '6ea2d087-ab9c-59dc-9657-8546025414d2', string: 5, fret: 3, drill: 'name_the_note', fret_window: { from_fret: 0 } },
}

function setUp(items: Item[]) {
  let names: ReturnType<typeof usePlanItemNames> | undefined
  mount(
    defineComponent({
      setup() {
        names = usePlanItemNames(() => items)
        return () => h('div')
      },
    }),
  )
  return names!
}

function namesOf(items: Item[]) {
  const { nameOf } = setUp(items)
  return (item: Item) => nameOf(item)
}

describe('usePlanItemNames', () => {
  beforeEach(() => {
    clearEmbeddedDiagramCache()
    GET.mockReset().mockResolvedValue({ data: { diagram_id: DIAGRAM, names: { en: 'A Major pentatonic — Box 4' } } })
  })
  afterEach(() => vi.restoreAllMocks())

  it('names an exercise by its title', () => {
    expect(namesOf([exercise])(exercise)).toBe('Name the interval')
  })

  it('names a play-along by its diagram, once loaded', async () => {
    const nameOf = namesOf([playAlong])
    expect(nameOf(playAlong)).toBeNull()

    await flushPromises()

    expect(nameOf(playAlong)).toBe('A Major pentatonic — Box 4')
    expect(GET).toHaveBeenCalledWith('/diagrams/{diagram_id}', { params: { path: { diagram_id: DIAGRAM } } })
  })

  it('has no name for a play-along whose diagram can’t be loaded', async () => {
    GET.mockResolvedValue({ error: { message: 'gone' } })
    const nameOf = namesOf([playAlong])
    await flushPromises()

    expect(nameOf(playAlong)).toBeNull()
  })

  it('has no name for a fretboard cell', () => {
    expect(namesOf([cell])(cell)).toBeNull()
  })

  it('labels a fretboard cell by its drill, and a play-along not loaded yet plainly', () => {
    GET.mockReturnValue(new Promise(() => {}))
    const { labelOf } = setUp([cell, playAlong])

    expect(labelOf(cell)).toBe('Name the note')
    expect(labelOf({ ...cell, fretboard_cell: { ...cell.fretboard_cell!, drill: 'find_the_note' } })).toBe('Find the note')
    expect(labelOf(playAlong)).toBe('Play-along')
  })

  it('never names a diagram shape by its diagram, which would give the shape away, but by its drill', async () => {
    const shape: Item = {
      item_key: `diagram_shape:${DIAGRAM}`,
      kind: 'diagram_shape',
      rung: 'know',
      reason: 'new',
      node_id: null,
      level: 'new',
      estimated_seconds: 10,
      diagram_shape: {
        diagram_id: DIAGRAM,
        layout_instrument_id: DIAGRAM,
        drill: 'name_the_shape',
        shape_family: 'caged-grip',
        shape: 'A',
        options: [],
        asked_interval: null,
      },
    }
    const { nameOf, labelOf } = setUp([shape])
    await flushPromises()

    expect(GET).not.toHaveBeenCalled()
    expect(nameOf(shape)).toBeNull()
    expect(labelOf(shape)).toBe('Name the shape')
    expect(labelOf({ ...shape, diagram_shape: { ...shape.diagram_shape!, drill: 'find_the_degree', asked_interval: '3' } })).toBe('Find the degree')
  })

  it('labels a named item by its name', async () => {
    const { labelOf } = setUp([exercise, playAlong])
    await flushPromises()

    expect(labelOf(exercise)).toBe('Name the interval')
    expect(labelOf(playAlong)).toBe('A Major pentatonic — Box 4')
  })

  it('calls a harmony question by the way it is asked, never by its answer', () => {
    const harmony = (kind: Item['kind'], way: NonNullable<Item['generated_choice']>['way']): Item => ({
      item_key: `${kind}:G:vi`,
      kind,
      rung: 'know',
      reason: 'new',
      node_id: null,
      level: 'new',
      estimated_seconds: 8,
      generated_choice: { way, music_key: 'G', numeral: null, chord: null, function: null, progression: null, chart: [], drawn_as: 'chord_symbols', options: [], voicings: [] },
    })
    const { nameOf, labelOf } = setUp([])

    expect(nameOf(harmony('diatonic_chord', 'numeral_to_chord'))).toBeNull()
    expect(labelOf(harmony('diatonic_chord', 'numeral_to_chord'))).toBe('Chords by number')
    expect(labelOf(harmony('diatonic_chord', 'chord_to_numeral'))).toBe('Numbers of chords')
    expect(labelOf(harmony('chord_function', 'chord_to_function'))).toBe('What chords do')
    expect(labelOf(harmony('chord_function', 'function_to_chord'))).toBe('Chords by what they do')
    expect(labelOf(harmony('chart_progression', 'chart_to_numbers'))).toBe('Reading charts')
    expect(labelOf(harmony('chart_progression', 'numbers_to_chart'))).toBe('Picking charts')
    expect(labelOf(harmony('heard_chord', 'cadence_then_chord'))).toBe('Chords by ear')
    expect(labelOf(harmony('heard_chord', 'see_then_name'))).toBe('Numbers of chords')
    expect(labelOf(harmony('heard_progression', 'progression_by_number'))).toBe('Progressions by ear')
  })

  it('names a chord item by the chords it plays: they are named, since playing them is the skill', () => {
    const base = { rung: 'play_clean', reason: 'new', node_id: null, level: 'new', estimated_seconds: 20 } as const
    const minute = { start_tempo_bpm: 40, target_changes_per_minute: 60, best_clean_changes_per_minute: null, last_changes_per_minute: null }
    const voicing: Item = { ...base, item_key: 'chord_voicing:d', kind: 'chord_voicing', chord_voicing: { diagram_id: 'd', chord_symbol: 'D' } }
    const change: Item = {
      ...base,
      item_key: 'chord_change:am:c',
      kind: 'chord_change',
      rung: 'play_in_time',
      chord_change: { from_diagram_id: 'am', to_diagram_id: 'c', from_chord_symbol: 'Am', to_chord_symbol: 'C', minute },
    }
    const rootFifth: Item = {
      ...base,
      item_key: 'root_fifth:bass:G',
      kind: 'root_fifth',
      root_fifth: { layout_instrument_id: 'bass', chord_symbol: 'G', root: { string: 4, fret: 3 }, fifth: { string: 3, fret: 5 } },
    }
    const rootChange: Item = {
      ...base,
      item_key: 'root_change:bass:Am:C',
      kind: 'root_change',
      rung: 'play_in_time',
      root_change: { layout_instrument_id: 'bass', from_chord_symbol: 'Am', to_chord_symbol: 'C', from_root: { string: 3, fret: 0 }, to_root: { string: 3, fret: 3 }, minute },
    }
    const { nameOf, labelOf } = setUp([voicing, change, rootFifth, rootChange])

    expect(nameOf(voicing)).toBe('Play D clean')
    expect(labelOf(change)).toBe('Am and C, back and forth')
    expect(labelOf(rootFifth)).toBe('Play the root and fifth of G')
    expect(labelOf(rootChange)).toBe('Am and C roots, back and forth')
  })
})
