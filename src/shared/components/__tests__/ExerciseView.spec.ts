import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ExerciseView from '@/shared/components/ExerciseView.vue'
import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']

const textOptions: Option[] = [
  { option_id: 'o1', label: 'Alternate picking', is_correct: true },
  { option_id: 'o2', label: 'Legato', is_correct: false },
]

const imageOptions: Option[] = [
  { option_id: 'i1', label: 'Open G chord', image_url: 'https://x/g.png', is_correct: true },
  { option_id: 'i2', label: 'Open C chord', image_url: 'https://x/c.png', is_correct: false },
]

const regionOptions: Option[] = [
  {
    option_id: 'r1',
    is_correct: true,
    region: { x: 0.2, y: 0.3, width: 0.1, height: 0.1, shape: 'circle' },
  },
]

describe('ExerciseView', () => {
  it('renders the prompt', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'Name this technique', options: textOptions },
    })

    expect(wrapper.text()).toContain('Name this technique')
  })

  it('renders text_response options as selectable rows', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Alternate picking')
  })

  it('renders image_choice options as an image grid', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_choice', prompt: 'p', options: imageOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Open G chord')
  })

  it("fills the option image's box via object-cover instead of a short, heavily-cropped thumbnail", () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_choice', prompt: 'p', options: imageOptions },
    })

    const img = wrapper.get('[data-test="exercise-option"] img')
    expect(img.classes()).toContain('object-cover')
    expect(img.classes()).toContain('h-full')
  })

  it('renders image_recognition options as click regions over the real stimulus image', () => {
    const wrapper = mount(ExerciseView, {
      props: {
        exerciseType: 'image_recognition',
        prompt: 'p',
        options: regionOptions,
        imageUrl: 'https://x/fretboard.png',
      },
    })

    expect(wrapper.findAll('[data-test="exercise-region"]')).toHaveLength(1)
    const img = wrapper.get('[data-test="exercise-stimulus-image"]')
    expect(img.attributes('src')).toBe('https://x/fretboard.png')
  })

  it('shows a placeholder instead of a region canvas when image_recognition has no stimulus image yet', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_recognition', prompt: 'p', options: regionOptions },
    })

    expect(wrapper.find('[data-test="exercise-stimulus-image"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="no-stimulus-image"]').exists()).toBe(true)
  })

  it('renders a circle region fully rounded and a rectangle region only corner-rounded', () => {
    const options: Option[] = [
      { option_id: 'r1', is_correct: true, region: { x: 0, y: 0, width: 0.1, height: 0.1, shape: 'circle' } },
      { option_id: 'r2', is_correct: false, region: { x: 0.5, y: 0.5, width: 0.1, height: 0.1, shape: 'rectangle' } },
    ]
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_recognition', prompt: 'p', options, imageUrl: 'https://x/fretboard.png' },
    })

    const regions = wrapper.findAll('[data-test="exercise-region"]')
    expect(regions[0]?.classes()).toContain('rounded-full')
    expect(regions[1]?.classes()).not.toContain('rounded-full')
  })

  it('renders audio_recognition with a real, playable audio element sourced from audioUrl', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'audio_recognition', prompt: 'p', options: textOptions, audioUrl: 'https://x/clip.mp3' },
    })

    const audio = wrapper.get('[data-test="exercise-audio-play"]')
    expect(audio.element.tagName).toBe('AUDIO')
    expect(audio.attributes('src')).toBe('https://x/clip.mp3')
    expect(audio.attributes('controls')).toBeDefined()
    expect(wrapper.findAll('[data-test="exercise-option"]')).toHaveLength(2)
  })

  it('marks an option selected on click without ever exposing is_correct', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[1]?.trigger('click')

    expect(rows[1]?.attributes('data-selected')).toBe('true')
    expect(rows[0]?.attributes('data-selected')).toBe('false')
    expect(wrapper.html()).not.toContain('is_correct')
    expect(wrapper.html()).not.toContain('is-correct')
  })

  it('allows selecting more than one option at once', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[0]?.trigger('click')
    await rows[1]?.trigger('click')

    expect(rows[0]?.attributes('data-selected')).toBe('true')
    expect(rows[1]?.attributes('data-selected')).toBe('true')
  })

  it('deselects an option when it is clicked again', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[0]?.trigger('click')
    await rows[0]?.trigger('click')

    expect(rows[0]?.attributes('data-selected')).toBe('false')
  })

  it('lays out the prompt beside the content in landscape direction', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions, direction: 'row' },
    })

    expect(wrapper.classes()).toContain('flex-row')
  })

  it('lays out the prompt above the content in portrait (default) direction', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    expect(wrapper.classes()).toContain('flex-col')
  })

  it('emits update:selectedOptionIds with the full selected set on each click', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[1]?.trigger('click')
    await rows[0]?.trigger('click')

    expect(wrapper.emitted('update:selectedOptionIds')).toEqual([[['o2']], [['o2', 'o1']]])
  })

  it('renders caller-supplied selectedOptionIds as already selected', () => {
    const wrapper = mount(ExerciseView, {
      props: {
        exerciseType: 'text_response',
        prompt: 'p',
        options: textOptions,
        selectedOptionIds: ['o1', 'o2'],
      },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    expect(rows[0]?.attributes('data-selected')).toBe('true')
    expect(rows[1]?.attributes('data-selected')).toBe('true')
  })
})
