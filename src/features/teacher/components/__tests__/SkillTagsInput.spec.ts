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

  it('lists matching suggestions while typing, excluding tags already added', async () => {
    const wrapper = mount(SkillTagsInput, {
      props: { tags: ['rhythm'], suggestions: ['rhythm', 'chord-recognition', 'ear-training'] },
    })

    await wrapper.get('input').setValue('r')

    const options = wrapper.findAll('[data-test="tag-suggestion"]').map((el) => el.text())
    expect(options).toEqual(['chord-recognition', 'ear-training'])
  })

  it('adds a suggestion with its own canonical casing when clicked, and clears the draft', async () => {
    const wrapper = mount(SkillTagsInput, { props: { tags: [], suggestions: ['Chord-Recognition'] } })

    await wrapper.get('input').setValue('chord')
    await wrapper.get('[data-test="tag-suggestion"]').trigger('click')

    expect(wrapper.emitted('add')).toEqual([['Chord-Recognition']])
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('')
  })

  it('offers a create option when the draft matches no existing suggestion', async () => {
    const wrapper = mount(SkillTagsInput, { props: { tags: [], suggestions: ['rhythm'] } })

    await wrapper.get('input').setValue('ear-training')

    expect(wrapper.get('[data-test="tag-create-option"]').text()).toContain('ear-training')
  })

  it('does not offer a create option when the draft exactly matches an existing suggestion', async () => {
    const wrapper = mount(SkillTagsInput, { props: { tags: [], suggestions: ['rhythm'] } })

    await wrapper.get('input').setValue('rhythm')

    expect(wrapper.find('[data-test="tag-create-option"]').exists()).toBe(false)
  })

  it('adding via the create option emits add with the trimmed draft', async () => {
    const wrapper = mount(SkillTagsInput, { props: { tags: [], suggestions: [] } })

    await wrapper.get('input').setValue('new-tag')
    await wrapper.get('[data-test="tag-create-option"]').trigger('click')

    expect(wrapper.emitted('add')).toEqual([['new-tag']])
  })

  it('emits focus when the input receives focus, so the caller can lazily load suggestions', async () => {
    const wrapper = mount(SkillTagsInput, { props: { tags: [] } })

    await wrapper.get('input').trigger('focus')

    expect(wrapper.emitted('focus')).toHaveLength(1)
  })

  it('shows no dropdown when the draft is empty', async () => {
    const wrapper = mount(SkillTagsInput, { props: { tags: [], suggestions: ['rhythm'] } })

    expect(wrapper.find('[data-test="tag-suggestion"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="tag-create-option"]').exists()).toBe(false)
  })
})
