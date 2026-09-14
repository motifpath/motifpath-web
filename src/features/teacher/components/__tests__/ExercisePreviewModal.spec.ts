import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ExercisePreviewModal from '@/features/teacher/components/ExercisePreviewModal.vue'
import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']

const options: Option[] = [
  { option_id: 'o1', label: 'Alternate picking', is_correct: true },
  { option_id: 'o2', label: 'Legato', is_correct: false },
]

describe('ExercisePreviewModal', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(ExercisePreviewModal, {
      props: { open: false, prompt: 'p', exerciseType: 'text_response', options },
    })

    expect(wrapper.find('[data-test="preview-modal"]').exists()).toBe(false)
  })

  it('mounts the real ExerciseView with the given prompt and options when open', () => {
    const wrapper = mount(ExercisePreviewModal, {
      props: { open: true, prompt: 'Name this technique', exerciseType: 'text_response', options },
    })

    expect(wrapper.text()).toContain('Name this technique')
    expect(wrapper.findAll('[data-test="exercise-option"]')).toHaveLength(2)
  })

  it('never leaks which option is correct in its own markup', () => {
    const wrapper = mount(ExercisePreviewModal, {
      props: { open: true, prompt: 'p', exerciseType: 'text_response', options },
    })

    expect(wrapper.html()).not.toContain('is_correct')
    expect(wrapper.html()).not.toContain('is-correct')
  })

  it('defaults to portrait (column) layout', () => {
    const wrapper = mount(ExercisePreviewModal, {
      props: { open: true, prompt: 'p', exerciseType: 'text_response', options },
    })

    expect(wrapper.get('[data-test="preview-portrait"]').classes()).toContain('bg-accent')
  })

  it('switches ExerciseView to row (landscape) layout on toggle', async () => {
    const wrapper = mount(ExercisePreviewModal, {
      props: { open: true, prompt: 'p', exerciseType: 'text_response', options },
    })

    await wrapper.get('[data-test="preview-landscape"]').trigger('click')

    expect(wrapper.get('[data-test="preview-landscape"]').classes()).toContain('bg-accent')
    expect(wrapper.get('[data-test="exercise-view-root"]').classes()).toContain('flex-row')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(ExercisePreviewModal, {
      props: { open: true, prompt: 'p', exerciseType: 'text_response', options },
    })

    await wrapper.get('[data-test="close-preview"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the overlay is clicked', async () => {
    const wrapper = mount(ExercisePreviewModal, {
      props: { open: true, prompt: 'p', exerciseType: 'text_response', options },
    })

    await wrapper.get('[data-test="preview-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
