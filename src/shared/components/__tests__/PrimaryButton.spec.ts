import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import PrimaryButton from '@/shared/components/PrimaryButton.vue'

describe('PrimaryButton', () => {
  it('renders a native button with type="button" by default', () => {
    const wrapper = mount(PrimaryButton, { slots: { default: 'Try again' } })

    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.text()).toBe('Try again')
  })

  it('emits a click event like a native button', async () => {
    const wrapper = mount(PrimaryButton, { slots: { default: 'Try again' } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('respects an explicit type prop', () => {
    const wrapper = mount(PrimaryButton, { props: { type: 'submit' } })

    expect(wrapper.get('button').attributes('type')).toBe('submit')
  })

  it('renders as a RouterLink when as="RouterLink" with a to prop', () => {
    const wrapper = mount(PrimaryButton, {
      props: { as: 'RouterLink', to: { name: 'path' } },
      slots: { default: 'Go to my path' },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const link = wrapper.getComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({ name: 'path' })
    expect(link.text()).toBe('Go to my path')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
