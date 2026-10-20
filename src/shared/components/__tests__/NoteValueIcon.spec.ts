import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NoteValueIcon from '@/shared/components/NoteValueIcon.vue'

describe('NoteValueIcon', () => {
  it('is an image named by its label', () => {
    const wrapper = mount(NoteValueIcon, { props: { kind: 'note', base: 4, label: 'Quarter' } })

    expect(wrapper.get('svg').attributes('role')).toBe('img')
    expect(wrapper.get('svg').attributes('aria-label')).toBe('Quarter')
  })

  it('draws a whole note without a stem, and hollow heads for whole and half notes', () => {
    const whole = mount(NoteValueIcon, { props: { kind: 'note', base: 1, label: 'Whole' } })
    const half = mount(NoteValueIcon, { props: { kind: 'note', base: 2, label: 'Half' } })
    const quarter = mount(NoteValueIcon, { props: { kind: 'note', base: 4, label: 'Quarter' } })

    expect(whole.find('[data-test="note-stem"]').exists()).toBe(false)
    expect(half.find('[data-test="note-stem"]').exists()).toBe(true)
    expect(whole.get('[data-test="note-head"]').attributes('fill')).toBe('none')
    expect(half.get('[data-test="note-head"]').attributes('fill')).toBe('none')
    expect(quarter.get('[data-test="note-head"]').attributes('fill')).toBe('currentColor')
  })

  it.each([
    [4, 0],
    [8, 1],
    [16, 2],
    [32, 3],
  ] as const)('gives a 1/%i note %i flags', (base, flags) => {
    const wrapper = mount(NoteValueIcon, { props: { kind: 'note', base, label: '' } })

    expect(wrapper.findAll('[data-test="note-flag"]')).toHaveLength(flags)
  })

  it.each([1, 2, 4, 8, 16, 32] as const)('draws a 1/%i rest as a rest, not a note', (base) => {
    const wrapper = mount(NoteValueIcon, { props: { kind: 'rest', base, label: '' } })

    expect(wrapper.find(`[data-test="rest-${base}"]`).exists()).toBe(true)
    expect(wrapper.find('[data-test="note-head"]').exists()).toBe(false)
  })

  it('adds the dot of a dotted value, and the number of a tuplet', () => {
    const dotted = mount(NoteValueIcon, { props: { kind: 'note', base: 4, dotted: true, label: '' } })
    const triplet = mount(NoteValueIcon, { props: { kind: 'rest', base: 8, tuplet: 3, label: '' } })

    expect(dotted.find('[data-test="value-dot"]').exists()).toBe(true)
    expect(triplet.get('[data-test="tuplet-number"]').text()).toBe('3')
  })
})
