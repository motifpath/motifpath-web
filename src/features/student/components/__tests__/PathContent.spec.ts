import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PathContent from '@/features/student/components/PathContent.vue'
import {
  makeStudentPathItem as step,
  makeStudentPathView as view,
} from '@/features/student/testing/studentPathItem'

function mountContent(v: ReturnType<typeof view>) {
  return mount(PathContent, {
    props: { view: v },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('PathContent', () => {
  it('renders the path title', () => {
    expect(mountContent(view([step(1)], { title: 'Blues Foundations' })).text()).toContain(
      'Blues Foundations',
    )
  })

  it('renders every step and no section headings for an unlabelled path', () => {
    const wrapper = mountContent(view([step(1), step(2), step(3)]))

    expect(wrapper.findAll('[data-test="path-step"]')).toHaveLength(3)
    expect(wrapper.find('[data-test="section-heading"]').exists()).toBe(false)
  })

  it('renders an unlabelled path as a single flat list, not one list per step', () => {
    const wrapper = mountContent(view([step(1), step(2), step(3)]))

    expect(wrapper.findAll('[data-test="path-section"]')).toHaveLength(1)
    expect(wrapper.findAll('ol')).toHaveLength(1)
  })

  it('renders a section heading above each labelled run of steps', () => {
    const wrapper = mountContent(
      view([step(1, 'Open chords'), step(2, 'Open chords'), step(3, 'Strumming patterns')]),
    )

    expect(wrapper.findAll('[data-test="section-heading"]').map((h) => h.text())).toEqual([
      'Open chords',
      'Strumming patterns',
    ])
  })

  it('does not merge a label reused after an unlabelled gap', () => {
    const wrapper = mountContent(
      view([step(1, 'Open chords'), step(2), step(3, 'Open chords')]),
    )

    expect(wrapper.findAll('[data-test="section-heading"]').map((h) => h.text())).toEqual([
      'Open chords',
      'Open chords',
    ])
  })

  it('keeps one continuous 1..N ordering across section lists', () => {
    const wrapper = mountContent(
      view([
        step(1, 'Open chords'),
        step(2, 'Open chords'),
        step(3, 'Strumming patterns'),
        step(4, 'Strumming patterns'),
      ]),
    )

    const lists = wrapper.findAll('[data-test="path-section"] ol')
    expect(lists).toHaveLength(2)
    expect(lists[0].attributes('start')).toBe('1')
    expect(lists[1].attributes('start')).toBe('3')
    expect(wrapper.findAll('[data-test="step-position"]').map((n) => n.text())).toEqual([
      '1',
      '2',
      '3',
      '4',
    ])
  })

  it('delegates per-step status rendering to PathStep', () => {
    const wrapper = mountContent(
      view([step(1, undefined, 'completed'), step(2, undefined, 'in_progress'), step(3, undefined, 'locked')]),
    )

    const statuses = wrapper.findAll('[data-test="step-status"]').map((s) => s.text())
    expect(statuses).toEqual(['Completed', 'In progress', 'Locked'])
  })

  it('shows an overall progress line reflecting completed vs total steps', () => {
    const wrapper = mountContent(
      view([step(1, undefined, 'completed'), step(2), step(3)]),
    )

    expect(wrapper.get('[data-test="path-progress"]').text()).toBe('1 of 3 steps complete')
  })

  it('reads "M of M steps complete" for a finished path with every step reviewable', () => {
    const wrapper = mountContent(
      view([step(1, undefined, 'completed'), step(2, undefined, 'completed')]),
    )

    expect(wrapper.get('[data-test="path-progress"]').text()).toBe('2 of 2 steps complete')

    const affordances = wrapper.findAll('[data-test="step-affordance"]').map((a) => a.text())
    expect(affordances).toEqual(['Review', 'Review'])
  })

  it('offers Open on the current step only', () => {
    const wrapper = mountContent(
      view([step(1, undefined, 'completed'), step(2, undefined, 'in_progress'), step(3, undefined, 'locked')]),
    )

    const affordances = wrapper.findAll('[data-test="step-affordance"]').map((a) => a.text())
    expect(affordances).toEqual(['Review', 'Open'])
  })

  it('contains no time-box language in the progress line', () => {
    const text = mountContent(view([step(1), step(2)])).get('[data-test="path-progress"]').text()

    expect(text).not.toMatch(/week|day|due|on track|behind|schedule/i)
  })
})
