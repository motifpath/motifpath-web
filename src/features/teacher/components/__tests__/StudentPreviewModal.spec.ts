import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import StudentPreviewModal from '@/features/teacher/components/StudentPreviewModal.vue'
import type { ImageOption, Region, TextOption } from '@/features/teacher/composables/useExerciseForm'

const textOptions: TextOption[] = [{ id: 'o1', label: 'G major', correct: true }]
const imageOptions: ImageOption[] = [{ id: 'o2', imageUrl: 'https://cdn.example.com/a.png', caption: 'A', correct: true }]
const regions: Region[] = [{ id: 'r1', x: 20, y: 30, width: 30, height: 30, shape: 'circle', correct: true }]

describe('StudentPreviewModal', () => {
  it('does not render when closed', () => {
    const wrapper = mount(StudentPreviewModal, {
      props: {
        open: false,
        prompt: 'Prompt text',
        exerciseType: 'text_response',
        imageUrl: '',
        textOptions,
        imageOptions: [],
        regions: [],
      },
    })

    expect(wrapper.find('[data-test="student-preview-modal"]').exists()).toBe(false)
  })

  it('shows the prompt and text options when open', () => {
    const wrapper = mount(StudentPreviewModal, {
      props: {
        open: true,
        prompt: 'Name this chord',
        exerciseType: 'text_response',
        imageUrl: '',
        textOptions,
        imageOptions: [],
        regions: [],
      },
    })

    expect(wrapper.text()).toContain('Name this chord')
    expect(wrapper.text()).toContain('G major')
  })

  it('renders image_choice options', () => {
    const wrapper = mount(StudentPreviewModal, {
      props: {
        open: true,
        prompt: 'Pick the diagram',
        exerciseType: 'image_choice',
        imageUrl: '',
        textOptions: [],
        imageOptions,
        regions: [],
      },
    })

    expect(wrapper.find('img[src="https://cdn.example.com/a.png"]').exists()).toBe(true)
  })

  it('renders the stimulus image and regions for image_recognition', () => {
    const wrapper = mount(StudentPreviewModal, {
      props: {
        open: true,
        prompt: 'Tap the root',
        exerciseType: 'image_recognition',
        imageUrl: 'https://cdn.example.com/fret.png',
        textOptions: [],
        imageOptions: [],
        regions,
      },
    })

    expect(wrapper.find('img[src="https://cdn.example.com/fret.png"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="preview-region"]')).toHaveLength(1)
  })

  it('toggles between portrait and landscape layout', async () => {
    const wrapper = mount(StudentPreviewModal, {
      props: {
        open: true,
        prompt: 'Prompt',
        exerciseType: 'text_response',
        imageUrl: '',
        textOptions,
        imageOptions: [],
        regions: [],
      },
    })

    expect(wrapper.get('[data-test="preview-layout"]').classes()).toContain('flex-col')

    await wrapper.get('[data-test="orientation-landscape"]').trigger('click')

    expect(wrapper.get('[data-test="preview-layout"]').classes()).toContain('flex-row')
  })

  it('emits close', async () => {
    const wrapper = mount(StudentPreviewModal, {
      props: {
        open: true,
        prompt: 'Prompt',
        exerciseType: 'text_response',
        imageUrl: '',
        textOptions,
        imageOptions: [],
        regions: [],
      },
    })

    await wrapper.get('[data-test="close-preview"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
