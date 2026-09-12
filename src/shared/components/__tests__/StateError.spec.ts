import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StateError from '@/shared/components/StateError.vue'

describe('StateError', () => {
  it('renders the message and a Try again control', () => {
    const wrapper = mount(StateError, { props: { message: "We couldn't load your path." } })

    expect(wrapper.text()).toContain("We couldn't load your path.")
    expect(wrapper.get('[data-test="retry"]').text()).toBe('Try again')
  })

  it("emits retry when the caller's control is used", async () => {
    const wrapper = mount(StateError, { props: { message: 'Failed.' } })

    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
