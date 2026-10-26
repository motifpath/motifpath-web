import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const progression = (key: string, en: string) => ({ progression_id: key, key, bars: [], confusable: [], names: { en } })
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: () => Promise.resolve({ data: [progression('I-IV-I-V', 'I–IV–I–V')], error: undefined, response: { status: 200 } }) }, eventApi: {} }),
}))

import TodaysPlan from '@/features/student/components/TodaysPlan.vue'
import { songItem } from '@/features/student/testing/songItems'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'

function item(itemKey: string, kind: Item['kind'], reason: Item['reason'], fields: Partial<Item> = {}): Item {
  return { item_key: itemKey, kind, reason, rung: 'know', node_id: null, level: 'new', estimated_seconds: 30, ...fields }
}

function cell(string: number, fret: number, drill: 'name_the_note' | 'find_the_note'): Item {
  return item(`fretboard_cell:${LAYOUT}:${string}:${fret}`, 'fretboard_cell', 'new', {
    fretboard_cell: { layout_instrument_id: LAYOUT, string, fret, drill, fret_window: { from_fret: 0 } },
  })
}

const items = [
  item('exercise:e1', 'exercise', 'weak'),
  cell(5, 3, 'name_the_note'),
  item('play_along:d1', 'play_along', 'stretch'),
  cell(6, 1, 'find_the_note'),
  cell(5, 5, 'name_the_note'),
  cell(6, 3, 'name_the_note'),
]

const labels: Record<string, string> = { 'exercise:e1': 'Name the interval', 'play_along:d1': 'A Major pentatonic — Box 4' }
const labelOf = (planItem: Item) => labels[planItem.item_key] ?? (planItem.fretboard_cell?.drill === 'find_the_note' ? 'Find the note' : 'Name the note')

function mountPlan() {
  return mount(TodaysPlan, { props: { items, minutes: 10, instrumentName: 'Guitar', labelOf } })
}

describe('TodaysPlan', () => {
  it("says a song puts it into music, and names the progression it plays", async () => {
    const song = songItem()
    const wrapper = mount(TodaysPlan, { props: { items: [song], minutes: 20, instrumentName: 'Guitar', labelOf: () => 'Amazing Grace' } })
    await flushPromises()

    const row = wrapper.get('[data-test="plan-row"]')
    expect(row.get('[data-test="plan-row-name"]').text()).toBe('Amazing Grace')
    expect(row.get('[data-test="plan-row-reason"]').text()).toBe('Put it into music · I–IV–I–V')
    expect(row.get('[data-test="plan-row-kind"]').text()).toBe('Song')
  })

  it('groups diagram shapes by drill too, counted as shapes', () => {
    const shape = (diagramId: string, drill: 'name_the_shape' | 'find_the_degree') =>
      item(`diagram_shape:${diagramId}`, 'diagram_shape', 'new', {
        diagram_shape: {
          diagram_id: diagramId,
          layout_instrument_id: LAYOUT,
          drill,
          shape_family: 'caged-grip',
          shape: 'A',
          options: [],
          asked_interval: drill === 'find_the_degree' ? '3' : null,
        },
      })
    const shapes = [shape('d1', 'name_the_shape'), cell(5, 3, 'name_the_note'), shape('d2', 'find_the_degree'), shape('d3', 'name_the_shape')]
    const shapeLabel = (planItem: Item) =>
      planItem.diagram_shape ? (planItem.diagram_shape.drill === 'name_the_shape' ? 'Name the shape' : 'Find the degree') : labelOf(planItem)
    const wrapper = mount(TodaysPlan, { props: { items: shapes, minutes: 5, instrumentName: 'Guitar', labelOf: shapeLabel } })

    expect(wrapper.findAll('[data-test="plan-row-name"]').map((row) => row.text())).toEqual([
      'Name the shape · 2 shapes',
      'Name the note · 1 note',
      'Find the degree · 1 shape',
    ])
  })

  it('lists what the session holds in order, the fretboard cells grouped by drill', () => {
    const wrapper = mountPlan()

    expect(wrapper.get('h1').text()).toBe("Today's plan")
    expect(wrapper.get('[data-test="plan-meta"]').text()).toBe('10 min · Guitar')
    expect(wrapper.findAll('[data-test="plan-row"]').map((row) => row.get('[data-test="plan-row-name"]').text())).toEqual([
      'Name the interval',
      'Name the note · 3 notes',
      'A Major pentatonic — Box 4',
      'Find the note · 1 note',
    ])
  })

  it('says why each was picked', () => {
    const wrapper = mountPlan()

    expect(wrapper.findAll('[data-test="plan-row-reason"]').map((reason) => reason.text())).toEqual([
      'Still settling in',
      'New',
      'A step further',
      'New',
    ])
  })

  it('says what kind of item each line is', () => {
    const wrapper = mountPlan()

    expect(wrapper.findAll('[data-test="plan-row-kind"]').map((kind) => kind.text())).toEqual(['Exercise', 'Fretboard', 'Play-along', 'Fretboard'])
  })

  it('numbers the lines in session order', () => {
    const wrapper = mountPlan()

    expect(wrapper.findAll('[data-test="plan-row-position"]').map((position) => position.text())).toEqual(['1', '2', '3', '4'])
  })

  describe('subjects', () => {
    const CHORDS = 'aaaaaaaa-0000-4000-8000-000000000001'
    const NOTES = 'aaaaaaaa-0000-4000-8000-000000000002'
    const OTHER = 'aaaaaaaa-0000-4000-8000-000000000003'
    const focusNodes = [
      { node_id: CHORDS, names: { en: 'Diatonic chords' } },
      { node_id: NOTES, names: { en: 'Find notes on the root strings' } },
    ]
    const mix = [
      item('play_along:warm', 'play_along', 'warm_up', { node_id: OTHER }),
      item('exercise:review', 'exercise', 'due', { node_id: OTHER }),
      item('exercise:chords', 'exercise', 'new', { node_id: CHORDS, rung: 'hear' }),
      item('exercise:chords-2', 'exercise', 'new', { node_id: CHORDS, rung: 'know' }),
      item('exercise:notes', 'exercise', 'due', { node_id: NOTES, rung: 'know' }),
    ]
    const names: Record<string, string> = {
      'play_along:warm': 'C major scale',
      'exercise:review': 'Major or minor?',
      'exercise:chords': 'Pick the chord',
      'exercise:chords-2': 'Which numeral?',
      'exercise:notes': 'Find the note',
      'exercise:child': 'Read the chart',
    }

    function mountMix(focusSource: 'suggested' | 'chosen' = 'suggested', planItems = mix, nodes = focusNodes) {
      return mount(TodaysPlan, {
        props: { items: planItems, minutes: 15, instrumentName: 'Guitar', labelOf: (planItem: Item) => names[planItem.item_key], focusSource, focusNodes: nodes },
      })
    }

    it("names Today's mix's subjects, main first, each with the rungs its new items come from", () => {
      const wrapper = mountMix()

      expect(wrapper.get('[data-test="plan-subjects-label"]').text()).toBe('Today')
      expect(
        wrapper.findAll('[data-test="plan-subject"]').map((subject) => [subject.get('[data-test="plan-subject-name"]').text(), subject.get('[data-test="plan-subject-rungs"]').text()]),
      ).toEqual([
        ['Diatonic chords', 'Know it · Hear it'],
        ['Find notes on the root strings', 'Know it'],
      ])
    })

    it('puts the warm-up first, then the quick review of other subjects, then the subjects, numbered on through the groups', () => {
      const wrapper = mountMix()

      const groups = wrapper.findAll('[data-test="plan-section"]')
      expect(groups.map((group) => group.attributes('data-kind'))).toEqual(['warm_up', 'review', 'subjects'])
      expect(groups.map((group) => group.find('[data-test="plan-section-title"]').exists() ? group.get('[data-test="plan-section-title"]').text() : null)).toEqual([
        null,
        'Quick review · other subjects',
        'Your subjects',
      ])
      expect(groups.map((group) => group.findAll('[data-test="plan-row-name"]').map((name) => name.text()))).toEqual([
        ['C major scale'],
        ['Major or minor?'],
        ['Pick the chord', 'Which numeral?', 'Find the note'],
      ])
      expect(wrapper.findAll('[data-test="plan-row-position"]').map((position) => position.text())).toEqual(['1', '2', '3', '4', '5'])
    })

    it('says once that the student chose the subject, and gives its items no group title', () => {
      const chosen = [item('exercise:chords', 'exercise', 'due', { node_id: CHORDS, rung: 'hear' }), item('exercise:child', 'exercise', 'new', { node_id: OTHER, rung: 'play_clean' })]
      const wrapper = mountMix('chosen', chosen, [{ node_id: CHORDS, names: { en: 'Common progressions' } }])

      expect(wrapper.get('[data-test="plan-subjects-label"]').text()).toBe('You chose this')
      expect(wrapper.findAll('[data-test="plan-subject-name"]').map((name) => name.text())).toEqual(['Common progressions'])
      expect(wrapper.get('[data-test="plan-subject-rungs"]').text()).toBe('Play it clean')
      expect(wrapper.findAll('[data-test="plan-section"]')).toHaveLength(1)
      expect(wrapper.find('[data-test="plan-section-title"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="plan-row-reason"]').map((reason) => reason.text())).toEqual(['Due for review', 'New'])
    })

    it('titles no group when there is no review block', () => {
      const wrapper = mountMix('suggested', mix.slice(2))

      expect(wrapper.find('[data-test="plan-section-title"]').exists()).toBe(false)
    })

    it('names no subjects for a plan that has none', () => {
      expect(mountPlan().find('[data-test="plan-subjects-label"]').exists()).toBe(false)
    })
  })

  it('starts the session with its primary action', async () => {
    const wrapper = mountPlan()
    const start = wrapper.get('[data-test="action-bar"] [data-test="lets-go"]')
    expect(start.attributes()).toHaveProperty('data-primary-action')

    await start.trigger('click')

    expect(wrapper.emitted('start')).toEqual([[]])
  })
})
