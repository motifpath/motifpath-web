import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import type { ItemOutcome } from '@/features/student/composables/usePracticeSessionRun'
import { summaryRows } from '@/features/student/utils/sessionSummary'

type Item = components['schemas']['PracticeSessionItem']

const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'

function item(itemKey: string, kind: Item['kind'], fields: Partial<Item> = {}): Item {
  return { item_key: itemKey, kind, reason: 'new', node_id: null, level: 'new', estimated_seconds: 30, ...fields }
}

function cell(fret: number, drill: 'name_the_note' | 'find_the_note' = 'name_the_note'): Item {
  return item(`fretboard_cell:${LAYOUT}:5:${fret}:${drill}`, 'fretboard_cell', {
    fretboard_cell: { layout_instrument_id: LAYOUT, string: 5, fret, drill },
  })
}

const right: ItemOutcome = { kind: 'answered', correct: true }
const wrong: ItemOutcome = { kind: 'answered', correct: false }

describe('summaryRows', () => {
  it('gives a play-along its fastest tempo and how that take went', () => {
    const triads = item('play_along:triads', 'play_along')
    const outcomes = new Map<string, ItemOutcome>([
      [
        'play_along:triads',
        {
          kind: 'played',
          takes: [
            { bpm: 70, rating: 'clean' },
            { bpm: 76, rating: 'struggled' },
            { bpm: 76, rating: 'clean' },
          ],
        },
      ],
    ])

    expect(summaryRows([triads], outcomes)).toEqual([
      { key: 'play_along:triads', item: triads, result: { kind: 'played', fastestBpm: 76, rating: 'clean' }, good: true },
    ])
  })

  it('says whether an exercise was right', () => {
    const third = item('exercise:third', 'exercise')
    const quality = item('exercise:quality', 'exercise')
    const outcomes = new Map([
      ['exercise:third', right],
      ['exercise:quality', wrong],
    ])

    expect(summaryRows([third, quality], outcomes).map((row) => [row.result, row.good])).toEqual([
      [{ kind: 'answered', correct: true }, true],
      [{ kind: 'answered', correct: false }, false],
    ])
  })

  it('counts a drill’s fretboard cells together, as the plan lists them', () => {
    const cells = [cell(1), cell(3), cell(5), cell(7, 'find_the_note')]
    const outcomes = new Map<string, ItemOutcome>([
      [cells[0].item_key, right],
      [cells[1].item_key, wrong],
      [cells[2].item_key, right],
      [cells[3].item_key, wrong],
    ])

    const rows = summaryRows(cells, outcomes)

    expect(rows.map((row) => [row.key, row.result, row.good])).toEqual([
      ['fretboard_cell:name_the_note', { kind: 'counted', right: 2, answered: 3 }, true],
      ['fretboard_cell:find_the_note', { kind: 'counted', right: 0, answered: 1 }, false],
    ])
  })

  it('leaves out what the student never got to answer, and a drill row counts only its answered cells', () => {
    const exercise = item('exercise:third', 'exercise')
    const cells = [cell(1), cell(3)]
    const outcomes = new Map<string, ItemOutcome>([[cells[0].item_key, right]])

    const rows = summaryRows([exercise, ...cells], outcomes)

    expect(rows.map((row) => [row.key, row.result])).toEqual([['fretboard_cell:name_the_note', { kind: 'counted', right: 1, answered: 1 }]])
  })

  it('has nothing to list when nothing was answered or rated', () => {
    expect(summaryRows([item('exercise:third', 'exercise')], new Map())).toEqual([])
  })
})
