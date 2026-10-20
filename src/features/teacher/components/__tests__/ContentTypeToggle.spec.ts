import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ContentTypeToggle from '@/features/teacher/components/ContentTypeToggle.vue'

describe('ContentTypeToggle', () => {
  it('renders video and article tabs, highlighting the current type', () => {
    const wrapper = mount(ContentTypeToggle, { props: { modelValue: 'video', disabled: false } })

    const videoTab = wrapper.get('[data-test="content-type-video"]')
    const articleTab = wrapper.get('[data-test="content-type-article"]')
    expect(videoTab.classes()).toContain('bg-accent')
    expect(articleTab.classes()).not.toContain('bg-accent')
  })

  it('emits update:modelValue when a tab is clicked', async () => {
    const wrapper = mount(ContentTypeToggle, { props: { modelValue: 'video', disabled: false } })

    await wrapper.get('[data-test="content-type-article"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['article']])
  })

  it('disables both tabs when disabled is true', () => {
    const wrapper = mount(ContentTypeToggle, { props: { modelValue: 'video', disabled: true } })

    expect(wrapper.get('[data-test="content-type-video"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="content-type-article"]').attributes('disabled')).toBeDefined()
  })
})
