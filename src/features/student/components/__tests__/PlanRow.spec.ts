import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PlanRow from '@/features/student/components/PlanRow.vue'

describe('PlanRow', () => {
  it('shows its place in the plan, its name, why it was picked and what kind of item it is', () => {
    const wrapper = mount(PlanRow, { props: { position: 3, name: 'Name the note · 8 notes', reason: 'weak', kind: 'fretboard_cell' } })

    expect(wrapper.get('[data-test="plan-row-position"]').text()).toBe('3')
    expect(wrapper.get('[data-test="plan-row-name"]').text()).toBe('Name the note · 8 notes')
    expect(wrapper.get('[data-test="plan-row-reason"]').text()).toBe('Still settling in')
    expect(wrapper.get('[data-test="plan-row-kind"]').text()).toBe('Fretboard')
  })

  it.each([
    ['exercise', 'Exercise'],
    ['play_along', 'Play-along'],
    ['fretboard_cell', 'Fretboard'],
    ['diagram_shape', 'Fretboard'],
    ['chord_change', 'Chord change'],
    ['song', 'Song'],
  ] as const)('labels a %s as “%s”', (kind, label) => {
    const wrapper = mount(PlanRow, { props: { position: 1, name: 'Item', reason: 'new', kind } })

    expect(wrapper.get('[data-test="plan-row-kind"]').text()).toBe(label)
  })

  it('wraps a long name instead of cutting it off', () => {
    const wrapper = mount(PlanRow, { props: { position: 1, name: 'Warm-up: Am pentatonic, box 1', reason: 'warm_up', kind: 'play_along' } })

    expect(wrapper.get('[data-test="plan-row-name"]').classes()).not.toContain('truncate')
  })
})
