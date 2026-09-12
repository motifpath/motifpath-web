import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StateEmpty from '@/shared/components/StateEmpty.vue'

describe('StateEmpty', () => {
  it('renders the heading and message', () => {
    const wrapper = mount(StateEmpty, {
      props: {
        heading: "You're all set",
        message: "We're building your personalized path. We'll let you know when it's ready.",
      },
    })

    expect(wrapper.find('h2').text()).toBe("You're all set")
    expect(wrapper.text()).toContain("We're building your personalized path.")
  })

  it('renders no action by default', () => {
    const wrapper = mount(StateEmpty, { props: { heading: 'Empty', message: 'Nothing here.' } })

    expect(wrapper.find('[data-test="empty-action"]').exists()).toBe(false)
  })

  it('renders a caller-supplied action when given', () => {
    const wrapper = mount(StateEmpty, {
      props: { heading: 'Empty', message: 'Nothing here.' },
      slots: { action: '<button data-test="empty-action">Check again</button>' },
    })

    expect(wrapper.find('[data-test="empty-action"]').exists()).toBe(true)
  })
})
