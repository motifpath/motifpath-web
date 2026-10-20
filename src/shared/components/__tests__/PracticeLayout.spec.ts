import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import PracticeLayout from '@/shared/components/PracticeLayout.vue'

const RouterViewStub = defineComponent({ name: 'RouterView', setup: () => () => h('div', 'route') })

describe('PracticeLayout', () => {
  it('gives the route the whole screen, with no app bar or footer', () => {
    const wrapper = mount(PracticeLayout, { global: { stubs: { RouterView: RouterViewStub } } })

    expect(wrapper.findComponent(RouterViewStub).exists()).toBe(true)
    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('footer').exists()).toBe(false)
    expect(wrapper.classes()).toContain('min-h-dvh')
  })
})
