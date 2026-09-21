import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ExercisePickerModal from '@/features/teacher/components/ExercisePickerModal.vue'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    exercise_id: 'e-1',
    title: 'Untitled',
    prompt: { type: 'doc', content: [] },
    exercise_type: 'text_response',
    skills: [],
    concepts: [],
    options: [],
    challenge_ids: [],
    content_node_ids: [],
    remediation_targets: [],
    languages: [],
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const exercises: Exercise[] = [
  makeExercise({ exercise_id: 'e-1', title: 'Name the chord', exercise_type: 'text_response' }),
  makeExercise({ exercise_id: 'e-2', title: 'Pick the diagram', exercise_type: 'image_choice' }),
]

describe('ExercisePickerModal', () => {
  it('lists exercises not already linked, and hides the linked ones', () => {
    const wrapper = mount(ExercisePickerModal, {
      props: { open: true, exercises, linkedExerciseIds: ['e-2'] },
    })

    expect(wrapper.text()).toContain('Name the chord')
    expect(wrapper.text()).not.toContain('Pick the diagram')
  })

  it('emits select with the exercise id when a row is clicked', async () => {
    const wrapper = mount(ExercisePickerModal, {
      props: { open: true, exercises, linkedExerciseIds: [] },
    })

    await wrapper.get('[data-test="exercise-picker-row"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['e-1']])
  })

  it('shows an empty state when every exercise is already linked', () => {
    const wrapper = mount(ExercisePickerModal, {
      props: { open: true, exercises, linkedExerciseIds: ['e-1', 'e-2'] },
    })

    expect(wrapper.find('[data-test="exercise-picker-empty"]').exists()).toBe(true)
  })

  it('filters by title as the teacher types', async () => {
    const wrapper = mount(ExercisePickerModal, {
      props: { open: true, exercises, linkedExerciseIds: [] },
    })

    await wrapper.get('[data-test="exercise-picker-search"]').setValue('diagram')

    expect(wrapper.text()).toContain('Pick the diagram')
    expect(wrapper.text()).not.toContain('Name the chord')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(ExercisePickerModal, {
      props: { open: true, exercises, linkedExerciseIds: [] },
    })

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
