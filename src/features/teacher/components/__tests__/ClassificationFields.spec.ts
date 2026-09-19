import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ClassificationFields from '@/features/teacher/components/ClassificationFields.vue'

describe('ClassificationFields', () => {
  it('renders the current skill, concept, and difficulty level', () => {
    const wrapper = mount(ClassificationFields, {
      props: { skill: 'triad-shapes', concept: 'chord-theory', difficultyLevel: 'intermediate', reviewState: null },
    })

    expect((wrapper.get('[data-test="skill"]').element as HTMLInputElement).value).toBe('triad-shapes')
    expect((wrapper.get('[data-test="concept"]').element as HTMLInputElement).value).toBe('chord-theory')
    expect((wrapper.get('[data-test="difficulty-level"]').element as HTMLSelectElement).value).toBe('intermediate')
  })

  it('emits update events for each field', async () => {
    const wrapper = mount(ClassificationFields, {
      props: { skill: '', concept: '', difficultyLevel: 'beginner', reviewState: null },
    })

    await wrapper.get('[data-test="skill"]').setValue('sweep-picking')
    expect(wrapper.emitted('update:skill')).toEqual([['sweep-picking']])

    await wrapper.get('[data-test="concept"]').setValue('interval-recognition')
    expect(wrapper.emitted('update:concept')).toEqual([['interval-recognition']])

    await wrapper.get('[data-test="difficulty-level"]').setValue('advanced')
    expect(wrapper.emitted('update:difficultyLevel')).toEqual([['advanced']])
  })

  it('shows no review-state badge when reviewState is null (not yet created)', () => {
    const wrapper = mount(ClassificationFields, {
      props: { skill: '', concept: '', difficultyLevel: 'beginner', reviewState: null },
    })

    expect(wrapper.find('[data-test="review-state"]').exists()).toBe(false)
  })

  it('shows a read-only review-state badge once the content node exists', () => {
    const wrapper = mount(ClassificationFields, {
      props: { skill: '', concept: '', difficultyLevel: 'beginner', reviewState: 'pending' },
    })

    expect(wrapper.get('[data-test="review-state"]').text()).toContain('pending')
  })
})
