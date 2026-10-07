import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TodaysPlan from '@/features/student/components/TodaysPlan.vue'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'

function item(itemKey: string, kind: Item['kind'], reason: Item['reason'], fields: Partial<Item> = {}): Item {
  return { item_key: itemKey, kind, reason, node_id: null, level: 'new', estimated_seconds: 30, ...fields }
}

function cell(string: number, fret: number, drill: 'name_the_note' | 'find_the_note'): Item {
  return item(`fretboard_cell:${LAYOUT}:${string}:${fret}`, 'fretboard_cell', 'new', {
    fretboard_cell: { layout_instrument_id: LAYOUT, string, fret, drill },
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
  return mount(TodaysPlan, { props: { items, minutes: 10, labelOf } })
}

describe('TodaysPlan', () => {
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
    const wrapper = mount(TodaysPlan, { props: { items: shapes, minutes: 5, labelOf: shapeLabel } })

    expect(wrapper.findAll('[data-test="plan-row-name"]').map((row) => row.text())).toEqual([
      'Name the shape · 2 shapes',
      'Name the note · 1 note',
      'Find the degree · 1 shape',
    ])
  })

  it('lists what the session holds in order, the fretboard cells grouped by drill', () => {
    const wrapper = mountPlan()

    expect(wrapper.get('h1').text()).toBe("Today's plan")
    expect(wrapper.text()).toContain('10 min')
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

  it('starts the session with its primary action', async () => {
    const wrapper = mountPlan()
    const start = wrapper.get('[data-test="action-bar"] [data-test="lets-go"]')
    expect(start.attributes()).toHaveProperty('data-primary-action')

    await start.trigger('click')

    expect(wrapper.emitted('start')).toEqual([[]])
  })
})
