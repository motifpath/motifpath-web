import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SessionRow from '@/features/admin/components/alpha/SessionRow.vue'
import { makeAlphaSession } from '@/shared/testUtils/alphaObservation'

describe('SessionRow', () => {
  it('shows when a finished session started, how long it took and what was answered', () => {
    const wrapper = mount(SessionRow, { props: { session: makeAlphaSession() } })

    expect(wrapper.text()).toContain('Wed 14 Oct · 07:40')
    expect(wrapper.text()).toContain('10 min planned · took 11 min · 9 items answered')
    expect(wrapper.get('[data-test="session-state"]').text()).toBe('Finished')
  })

  it('says when a student left early', () => {
    const session = makeAlphaSession({ ended_at: '2026-10-14T10:44:00Z', state: 'ended_early', items_answered: 3 })
    const wrapper = mount(SessionRow, { props: { session } })

    expect(wrapper.text()).toContain('10 min planned · left after 4 min · 3 items answered')
    expect(wrapper.get('[data-test="session-state"]').text()).toBe('Ended early')
  })

  it('says when an abandoned session went silent', () => {
    const session = makeAlphaSession({ ended_at: '2026-10-14T10:46:00Z', state: 'abandoned', items_answered: 1 })
    const wrapper = mount(SessionRow, { props: { session } })

    expect(wrapper.text()).toContain('10 min planned · silent after 6 min · 1 item answered')
    expect(wrapper.get('[data-test="session-state"]').text()).toBe('Abandoned')
  })

  it('has no end yet while in progress', () => {
    const session = makeAlphaSession({ ended_at: null, state: 'in_progress', items_answered: 2 })
    const wrapper = mount(SessionRow, { props: { session } })

    expect(wrapper.text()).toContain('10 min planned · 2 items answered')
    expect(wrapper.get('[data-test="session-state"]').text()).toBe('In progress')
  })
})
