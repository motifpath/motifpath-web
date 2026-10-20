import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ObservationCard from '@/features/admin/components/alpha/ObservationCard.vue'
import ObservationRow from '@/features/admin/components/alpha/ObservationRow.vue'
import { ALPHA_NOW, makeAlphaStudent } from '@/shared/testUtils/alphaObservation'

const to = { name: 'admin-alpha-student', params: { studentId: 's-1' } }

function mountRow(student = makeAlphaStudent()) {
  return mount(ObservationRow, { props: { student, now: ALPHA_NOW, to }, global: { stubs: { RouterLink: RouterLinkStub } } })
}

function mountCard(student = makeAlphaStudent()) {
  return mount(ObservationCard, { props: { student, now: ALPHA_NOW, to }, global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('ObservationRow', () => {
  it("shows the week, the weeks so far and the first path", () => {
    const wrapper = mountRow()

    expect(wrapper.text()).toContain('Camila Duarte')
    expect(wrapper.text()).toContain('Joined 21 Sep')
    expect(wrapper.get('[data-test="week-sessions"]').text()).toBe('2 sessions')
    expect(wrapper.get('[data-test="week-chip"]').text()).toBe('1 to go')
    expect(wrapper.findAll('[data-test="week-bar"]')).toHaveLength(3)
    expect(wrapper.get('[data-test="weeks-caption"]').text()).toBe('3 of 3 weeks at 3+')
    expect(wrapper.text()).toContain('Guitar foundations')
    expect(wrapper.text()).toContain('11 of 18 nodes · 61%')
  })

  it('says one session in the singular', () => {
    const wrapper = mountRow(makeAlphaStudent({ finished_sessions_in_week: 1 }))

    expect(wrapper.get('[data-test="week-sessions"]').text()).toBe('1 session')
    expect(wrapper.get('[data-test="week-chip"]').text()).toBe('2 to go')
  })

  it("shows a quiet student's last activity in the danger colour", () => {
    const wrapper = mountRow(makeAlphaStudent({ last_active_at: '2026-10-05T12:00:00Z', quiet: true }))

    const lastActive = wrapper.get('[data-test="last-active"]')
    expect(lastActive.text()).toBe('9 days ago')
    expect(lastActive.classes()).toContain('text-danger')
  })

  it('opens the student', () => {
    const wrapper = mountRow()

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual(to)
  })
})

describe('ObservationCard', () => {
  it('sums the student up in two lines and a bar', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('Camila Duarte')
    expect(wrapper.get('[data-test="week-chip"]').text()).toBe('1 to go')
    expect(wrapper.text()).toContain('2 sessions this week · 3 of 3 weeks at 3+')
    expect(wrapper.text()).toContain('First path · Guitar foundations · 11 of 18 · 61%')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual(to)
  })

  it('says how long a quiet student has been away', () => {
    const wrapper = mountCard(makeAlphaStudent({ last_active_at: '2026-10-05T12:00:00Z', quiet: true }))

    expect(wrapper.get('[data-test="last-active"]').text()).toBe('9 days ago')
  })
})
