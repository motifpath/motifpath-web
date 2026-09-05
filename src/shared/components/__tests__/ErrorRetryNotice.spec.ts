import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ErrorRetryNotice from '@/shared/components/ErrorRetryNotice.vue'

describe('ErrorRetryNotice', () => {
  it('renders the given message', () => {
    const wrapper = mount(ErrorRetryNotice, { props: { message: 'We could not load your path.' } })

    expect(wrapper.text()).toContain('We could not load your path.')
  })

  it('defaults its test id to "error"', () => {
    const wrapper = mount(ErrorRetryNotice, { props: { message: 'Something went wrong.' } })

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })

  it('uses a custom test id when given one', () => {
    const wrapper = mount(ErrorRetryNotice, {
      props: { message: 'Something went wrong.', testId: 'registration-failed' },
    })

    expect(wrapper.find('[data-test="registration-failed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
  })

  it('emits retry when the try-again control is used', async () => {
    const wrapper = mount(ErrorRetryNotice, { props: { message: 'Something went wrong.' } })

    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
