import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StateLoading from '@/shared/components/StateLoading.vue'

describe('StateLoading', () => {
  it('renders a generic loading line with no noun given', () => {
    const wrapper = mount(StateLoading)

    expect(wrapper.text()).toBe('Loading…')
  })

  it('composes the caller-supplied noun into the loading line', () => {
    const wrapper = mount(StateLoading, { props: { noun: 'your path' } })

    expect(wrapper.text()).toBe('Loading your path…')
  })
})
