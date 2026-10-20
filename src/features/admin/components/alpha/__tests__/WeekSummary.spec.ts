import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import WeekSummary from '@/features/admin/components/alpha/WeekSummary.vue'

describe('WeekSummary', () => {
  it("shows the week's sessions, the weeks at 3+ and the first path's share", () => {
    const wrapper = mount(WeekSummary, { props: { sessions: 2, weeksAtTarget: 3, weeksSoFar: 3, percent: 61 } })

    const values = wrapper.findAll('[data-test="summary-value"]').map((v) => v.text())
    expect(values).toEqual(['2', '3 of 3', '61%'])
    expect(wrapper.text()).toContain('this week')
    expect(wrapper.text()).toContain('weeks at 3+')
    expect(wrapper.text()).toContain('first path')
  })
})
