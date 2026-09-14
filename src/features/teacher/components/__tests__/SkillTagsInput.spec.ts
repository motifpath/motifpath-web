import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SkillTagsInput from '@/features/teacher/components/SkillTagsInput.vue'

describe('SkillTagsInput', () => {
  it('renders each tag and emits add on Enter', async () => {
    const wrapper = mount(SkillTagsInput, { props: { tags: ['alternate_picking'] } })

    expect(wrapper.text()).toContain('alternate_picking')

    const input = wrapper.get('input')
    await input.setValue('technique')
    await input.trigger('keydown.enter')

    expect(wrapper.emitted('add')).toEqual([['technique']])
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('emits remove when a tag chip is dismissed', async () => {
    const wrapper = mount(SkillTagsInput, { props: { tags: ['alternate_picking'] } })

    await wrapper.get('[data-test="tag-remove"]').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['alternate_picking']])
  })
})
