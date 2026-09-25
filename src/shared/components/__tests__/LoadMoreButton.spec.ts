import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'

describe('LoadMoreButton', () => {
  it('shows how many items are loaded out of the total', () => {
    const wrapper = mount(LoadMoreButton, { props: { loaded: 20, total: 45 } })

    expect(wrapper.text()).toContain('Showing 20 of 45')
  })

  it('offers a load-more control while more items remain, and emits load when used', async () => {
    const wrapper = mount(LoadMoreButton, { props: { loaded: 20, total: 45 } })

    await wrapper.get('[data-test="load-more"]').trigger('click')

    expect(wrapper.emitted('load')).toHaveLength(1)
  })

  it('renders nothing once every item is loaded', () => {
    const wrapper = mount(LoadMoreButton, { props: { loaded: 45, total: 45 } })

    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('disables the control while the next page is loading', () => {
    const wrapper = mount(LoadMoreButton, { props: { loaded: 20, total: 45, loading: true } })

    expect(wrapper.get('[data-test="load-more"]').attributes('disabled')).toBeDefined()
  })

  it('tells the user when the next page failed, keeping the control available to retry', () => {
    const wrapper = mount(LoadMoreButton, { props: { loaded: 20, total: 45, failed: true } })

    expect(wrapper.find('[data-test="load-more-error"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="load-more"]').attributes('disabled')).toBeUndefined()
  })
})
