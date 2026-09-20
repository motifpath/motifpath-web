import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ClassificationFields from '@/features/teacher/components/ClassificationFields.vue'

const skillNodes = [{ id: 's-1', name: 'triad-shapes', parent_id: null }]
const conceptNodes = [{ id: 'c-1', name: 'chord-theory', parent_id: null }]

describe('ClassificationFields', () => {
  it('renders the skill and concept tree pickers pre-selected and the current difficulty level', () => {
    const wrapper = mount(ClassificationFields, {
      props: {
        skillIds: ['s-1'],
        conceptIds: ['c-1'],
        skillNodes,
        conceptNodes,
        difficultyLevel: 'intermediate',
        reviewState: null,
      },
    })

    expect(wrapper.text()).toContain('triad-shapes')
    expect(wrapper.text()).toContain('chord-theory')
    expect((wrapper.get('[data-test="difficulty-level"]').element as HTMLSelectElement).value).toBe('intermediate')
  })

  it('offers all 5 difficulty levels', () => {
    const wrapper = mount(ClassificationFields, {
      props: { skillIds: [], conceptIds: [], skillNodes, conceptNodes, difficultyLevel: 'beginner', reviewState: null },
    })

    const options = wrapper
      .findAll('[data-test="difficulty-level"] option')
      .map((o) => (o.element as HTMLOptionElement).value)
    expect(options).toEqual(['beginner', 'early_intermediate', 'intermediate', 'advanced', 'expert'])
  })

  it('emits update:skillIds/update:conceptIds from the tree pickers and update:difficultyLevel from the select', async () => {
    const wrapper = mount(ClassificationFields, {
      props: { skillIds: [], conceptIds: [], skillNodes, conceptNodes, difficultyLevel: 'beginner', reviewState: null },
    })

    await wrapper.get('[data-test="tree-node-checkbox"][value="s-1"]').setValue(true)
    expect(wrapper.emitted('update:skillIds')).toEqual([[['s-1']]])

    const conceptCheckboxes = wrapper.findAll('[data-test="tree-node-checkbox"][value="c-1"]')
    await conceptCheckboxes[0].setValue(true)
    expect(wrapper.emitted('update:conceptIds')).toEqual([[['c-1']]])

    await wrapper.get('[data-test="difficulty-level"]').setValue('advanced')
    expect(wrapper.emitted('update:difficultyLevel')).toEqual([['advanced']])
  })

  it('re-emits createSkill/createConcept from the tree pickers', async () => {
    const wrapper = mount(ClassificationFields, {
      props: { skillIds: [], conceptIds: [], skillNodes, conceptNodes, difficultyLevel: 'beginner', reviewState: null },
    })

    const nameInputs = wrapper.findAll('[data-test="tree-create-name"]')
    await nameInputs[0].setValue('sweep-picking')
    const submitButtons = wrapper.findAll('[data-test="tree-create-submit"]')
    await submitButtons[0].trigger('click')
    expect(wrapper.emitted('createSkill')).toEqual([[{ name: 'sweep-picking', parentId: null }]])

    await nameInputs[1].setValue('interval-recognition')
    await submitButtons[1].trigger('click')
    expect(wrapper.emitted('createConcept')).toEqual([[{ name: 'interval-recognition', parentId: null }]])
  })

  it('shows no review-state badge when reviewState is null (not yet created)', () => {
    const wrapper = mount(ClassificationFields, {
      props: { skillIds: [], conceptIds: [], skillNodes, conceptNodes, difficultyLevel: 'beginner', reviewState: null },
    })

    expect(wrapper.find('[data-test="review-state"]').exists()).toBe(false)
  })

  it('shows a read-only review-state badge once the content node exists', () => {
    const wrapper = mount(ClassificationFields, {
      props: { skillIds: [], conceptIds: [], skillNodes, conceptNodes, difficultyLevel: 'beginner', reviewState: 'pending' },
    })

    expect(wrapper.get('[data-test="review-state"]').text()).toContain('pending')
  })
})
