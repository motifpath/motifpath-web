import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PartRow from '@/features/student/components/PartRow.vue'
import type { OutlinePart } from '@/features/student/utils/courseOutline'

function part(overrides: Partial<OutlinePart> = {}): OutlinePart {
  return {
    position: 2,
    title: 'Major triads',
    state: 'current',
    lessonCount: 14,
    lessonsDone: null,
    lessons: [{ title: 'Root-position triads' }, { title: 'Triads on strings 1–3' }],
    ...overrides,
  }
}

function mountRow(props: { part: OutlinePart; expanded?: boolean }, slot?: string) {
  return mount(PartRow, { props, slots: slot ? { default: slot } : {} })
}

describe('PartRow', () => {
  it('reads a done part with a check and its lesson count', () => {
    const wrapper = mountRow({ part: part({ position: 1, title: 'Open chords', state: 'done', lessonCount: 12 }) })

    expect(wrapper.get('[data-test="part-row"]').attributes('data-state')).toBe('done')
    expect(wrapper.find('[data-test="part-done"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="part-title"]').text()).toBe('Open chords')
    expect(wrapper.get('[data-test="part-meta"]').text()).toBe('Part 1 · 12 lessons · Done')
  })

  it('counts the current part’s lessons when they are known', () => {
    const wrapper = mountRow({ part: part({ lessonsDone: 7 }) })

    expect(wrapper.get('[data-test="part-marker"]').text()).toBe('2')
    expect(wrapper.get('[data-test="part-meta"]').text()).toBe('Part 2 · 7 of 14 lessons done')
    expect(wrapper.get('[data-test="part-row"]').attributes('aria-current')).toBe('step')
  })

  it('shows the current part without a count when it is unknown', () => {
    expect(mountRow({ part: part() }).get('[data-test="part-meta"]').text()).toBe('Part 2 · 14 lessons')
  })

  it('reads an upcoming part with its number and lesson count', () => {
    const wrapper = mountRow({ part: part({ position: 3, state: 'upcoming', lessonCount: 1 }) })

    expect(wrapper.get('[data-test="part-marker"]').text()).toBe('3')
    expect(wrapper.get('[data-test="part-meta"]').text()).toBe('Part 3 · 1 lesson')
    expect(wrapper.get('[data-test="part-row"]').attributes('aria-current')).toBeUndefined()
  })

  it('hides its lessons until unfolded, and asks to toggle when tapped', async () => {
    const wrapper = mountRow({ part: part() }, '<a data-test="open-in-path">Open in My path</a>')
    const toggle = wrapper.get('[data-test="part-toggle"]')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="part-lessons"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="open-in-path"]').exists()).toBe(false)

    await toggle.trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('lists the lesson titles and its action when unfolded', () => {
    const wrapper = mountRow({ part: part(), expanded: true }, '<a data-test="open-in-path">Open in My path</a>')

    expect(wrapper.get('[data-test="part-toggle"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('[data-test="part-lesson"]').map((lesson) => lesson.text())).toEqual([
      'Root-position triads',
      'Triads on strings 1–3',
    ])
    expect(wrapper.find('[data-test="open-in-path"]').exists()).toBe(true)
  })

  it('checks the done lessons and folds the long runs', () => {
    const lessons = Array.from({ length: 14 }, (_, index) => ({ title: `Lesson ${index + 1}`, done: index < 7 }))
    const wrapper = mountRow({ part: part({ lessonsDone: 7, lessons }), expanded: true })

    const lines = wrapper.findAll('[data-test="part-lessons"] li')
    expect(lines.map((line) => line.text())).toEqual([
      'Lesson 1',
      'Lesson 2',
      '5 more done',
      'Lesson 8',
      'Lesson 9',
      '… 5 more',
    ])
    expect(lines[0]?.find('[data-test="lesson-done"]').exists()).toBe(true)
    expect(lines[3]?.find('[data-test="lesson-done"]').exists()).toBe(false)
  })
})
