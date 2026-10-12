import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ExercisePreview from '@/features/teacher/components/ExercisePreview.vue'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']

const options: Option[] = [
  { option_id: 'o1', label: 'Alternate picking', is_correct: true },
  { option_id: 'o2', label: 'Legato', is_correct: false },
]

describe('ExercisePreview', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: false, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })

    expect(wrapper.find('[data-test="preview-layer"]').exists()).toBe(false)
  })

  it('mounts the real ExerciseView with the given prompt and options when open', () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('Name this technique'), exerciseType: 'text_response', options },
    })

    expect(wrapper.text()).toContain('Name this technique')
    expect(wrapper.findAll('[data-test="exercise-option"]')).toHaveLength(2)
  })

  it('forwards imageUrl/audioUrl through to the real ExerciseView', () => {
    const wrapper = mount(ExercisePreview, {
      props: {
        open: true,
        prompt: plainTextPrompt('p'),
        exerciseType: 'image_recognition',
        options: [{ option_id: 'r1', is_correct: true, region: { x: 0, y: 0, width: 0.1, height: 0.1, shape: 'circle' } }],
        imageUrl: 'https://x/fretboard.png',
      },
    })

    expect(wrapper.get('[data-test="exercise-stimulus-image"]').attributes('src')).toBe('https://x/fretboard.png')
  })

  it('never leaks which option is correct in its own markup', () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })

    expect(wrapper.html()).not.toContain('is_correct')
    expect(wrapper.html()).not.toContain('is-correct')
  })

  it('defaults to portrait (column) layout', () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })

    expect(wrapper.get('[data-test="preview-portrait"]').classes()).toContain('bg-accent')
  })

  it('switches ExerciseView to row (landscape) layout on toggle', async () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })

    await wrapper.get('[data-test="preview-landscape"]').trigger('click')

    expect(wrapper.get('[data-test="preview-landscape"]').classes()).toContain('bg-accent')
    expect(wrapper.get('[data-test="exercise-view-root"]').classes()).toContain('flex-row')
  })

  it('sizes the preview frame like a real mobile screen and scrolls overflow internally, instead of clipping content', () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })

    const frame = wrapper.get('[data-test="preview-frame"]')
    expect(frame.classes()).toContain('h-[667px]')
    expect(frame.classes()).toContain('w-[375px]')
    expect(frame.classes()).toContain('overflow-y-auto')
  })

  it('swaps the frame to landscape dimensions on toggle', async () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })

    await wrapper.get('[data-test="preview-landscape"]').trigger('click')

    const frame = wrapper.get('[data-test="preview-frame"]')
    expect(frame.classes()).toContain('h-[375px]')
    expect(frame.classes()).toContain('w-[667px]')
  })

  it('shows the real ExerciseView full screen under the Preview bar', () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })

    expect(wrapper.get('[data-test="preview-bar"]').text()).toContain('Preview as student')
    expect(wrapper.get('[data-test="preview-layer"]').findComponent({ name: 'ExerciseView' }).exists()).toBe(true)
  })

  it('× closes it', async () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })

    await wrapper.get('[data-test="preview-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('ExercisePreview — grading', () => {
  it('Check grades the answer as a student’s would be, marking the right options', async () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })
    expect(wrapper.getComponent({ name: 'ExerciseView' }).props('reveal')).toBeUndefined()

    await wrapper.get('[data-test="preview-check"]').trigger('click')

    expect(wrapper.getComponent({ name: 'ExerciseView' }).props('reveal')).toEqual({ correctOptionIds: ['o1'] })
  })

  it('Try again clears the grade for another go', async () => {
    const wrapper = mount(ExercisePreview, {
      props: { open: true, prompt: plainTextPrompt('p'), exerciseType: 'text_response', options },
    })
    await wrapper.get('[data-test="preview-check"]').trigger('click')

    await wrapper.get('[data-test="preview-try-again"]').trigger('click')

    expect(wrapper.getComponent({ name: 'ExerciseView' }).props('reveal')).toBeUndefined()
    expect(wrapper.find('[data-test="preview-check"]').exists()).toBe(true)
  })
})
