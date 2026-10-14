import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import WeeklyBars from '@/features/admin/components/alpha/WeeklyBars.vue'

describe('WeeklyBars', () => {
  const weeks = [
    { week_start: '2026-09-21', finished_sessions: 3 },
    { week_start: '2026-09-28', finished_sessions: 1 },
    { week_start: '2026-10-05', finished_sessions: 4 },
  ]

  it('draws one bar per week against the line at 3, marking the weeks at the target', () => {
    const wrapper = mount(WeeklyBars, { props: { weeks, weeksAtTarget: 2, weeksSoFar: 3 } })

    const bars = wrapper.findAll('[data-test="week-bar"]')
    expect(bars).toHaveLength(3)
    expect(bars.map((b) => b.attributes('data-at-target'))).toEqual(['true', 'false', 'true'])
    expect(wrapper.find('[data-test="target-line"]').exists()).toBe(true)
  })

  it('says how many weeks so far were at the target, counting weeks not drawn', () => {
    const wrapper = mount(WeeklyBars, { props: { weeks, weeksAtTarget: 7, weeksSoFar: 10 } })

    expect(wrapper.get('[data-test="weeks-caption"]').text()).toBe('7 of 10 weeks at 3+')
  })

  it('says when no week has finished yet', () => {
    const wrapper = mount(WeeklyBars, { props: { weeks: [], weeksAtTarget: 0, weeksSoFar: 0 } })

    expect(wrapper.findAll('[data-test="week-bar"]')).toHaveLength(0)
    expect(wrapper.get('[data-test="weeks-caption"]').text()).toBe('No finished week yet')
  })
})
