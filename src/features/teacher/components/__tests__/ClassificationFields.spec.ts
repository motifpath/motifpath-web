import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ClassificationFields from '@/features/teacher/components/ClassificationFields.vue'
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'

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

    const openButtons = wrapper.findAll('[data-test="tree-open-picker"]')
    await openButtons[0].trigger('click')
    await wrapper.get('[data-test="tree-node-checkbox"][value="s-1"]').setValue(true)
    expect(wrapper.emitted('update:skillIds')).toEqual([[['s-1']]])

    await openButtons[1].trigger('click')
    const conceptCheckboxes = wrapper.findAll('[data-test="tree-node-checkbox"][value="c-1"]')
    await conceptCheckboxes[0].setValue(true)
    expect(wrapper.emitted('update:conceptIds')).toEqual([[['c-1']]])

    await wrapper.get('[data-test="difficulty-level"]').setValue('advanced')
    expect(wrapper.emitted('update:difficultyLevel')).toEqual([['advanced']])
  })

  it('passes the content instruments and the applies suggestions to the pickers, which ask the team for missing nodes', () => {
    const wrapper = mount(ClassificationFields, {
      props: {
        skillIds: [],
        conceptIds: [],
        skillNodes,
        conceptNodes,
        difficultyLevel: 'beginner',
        reviewState: null,
        instrumentIds: ['guitar'],
        suggestedSkillIds: ['s-1'],
        suggestedConceptIds: ['c-1'],
      },
    })

    const [skillPicker, conceptPicker] = wrapper.findAllComponents(SkillConceptTreePicker)
    expect(skillPicker!.props()).toMatchObject({ instrumentIds: ['guitar'], suggestedIds: ['s-1'], missingHint: true })
    expect(conceptPicker!.props()).toMatchObject({ instrumentIds: ['guitar'], suggestedIds: ['c-1'], missingHint: true })
  })

  it('shows a tree that failed to load and asks for it again on retry', async () => {
    const wrapper = mount(ClassificationFields, {
      props: {
        skillIds: [],
        conceptIds: [],
        skillNodes: [],
        conceptNodes,
        difficultyLevel: 'beginner',
        reviewState: null,
        skillsError: true,
      },
    })

    const [skillPicker, conceptPicker] = wrapper.findAllComponents(SkillConceptTreePicker)
    expect(skillPicker!.props('loadFailed')).toBe(true)
    expect(conceptPicker!.props('loadFailed')).toBe(false)

    skillPicker!.vm.$emit('retry')
    conceptPicker!.vm.$emit('retry')
    expect(wrapper.emitted('retrySkills')).toHaveLength(1)
    expect(wrapper.emitted('retryConcepts')).toHaveLength(1)
  })

  it('lists every node when no content instruments are given', () => {
    const wrapper = mount(ClassificationFields, {
      props: { skillIds: [], conceptIds: [], skillNodes, conceptNodes, difficultyLevel: 'beginner', reviewState: null },
    })

    for (const picker of wrapper.findAllComponents(SkillConceptTreePicker)) {
      expect(picker.props('instrumentIds')).toBeNull()
    }
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
