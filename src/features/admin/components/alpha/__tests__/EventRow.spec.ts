import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EventRow from '@/features/admin/components/alpha/EventRow.vue'
import { makeLoggedEvent } from '@/shared/testUtils/alphaObservation'

describe('EventRow', () => {
  it('shows when it was received, whose it is, its exact type and its details', () => {
    const wrapper = mount(EventRow, { props: { logged: makeLoggedEvent(), studentName: 'Camila Duarte' } })

    expect(wrapper.get('[data-test="event-received"]').text()).toBe('14 Oct · 07:51:12')
    expect(wrapper.get('[data-test="event-student"]').text()).toBe('Camila Duarte')
    expect(wrapper.get('[data-test="event-type"]').text()).toBe('practice.session_ended')
    expect(wrapper.get('[data-test="event-details"]').text()).toBe('session 7f3c9a10… · not left early · 9 items answered')
  })
})
