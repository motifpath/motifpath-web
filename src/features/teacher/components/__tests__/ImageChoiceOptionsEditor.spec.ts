import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ImageChoiceOptionsEditor from '@/features/teacher/components/ImageChoiceOptionsEditor.vue'
import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import type { ImageOption } from '@/features/teacher/composables/useExerciseForm'

vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:local-preview') })

const options: ImageOption[] = [
  { id: 'o1', imageUrl: 'https://cdn.example.com/a.png', caption: 'Open position', correct: true },
  { id: 'o2', imageUrl: '', caption: '', correct: false },
]

describe('ImageChoiceOptionsEditor', () => {
  it('renders a caption input and correct state per option', () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })

    const captions = wrapper.findAll('input[type="text"]')
    expect(captions.map((c) => (c.element as HTMLInputElement).value)).toEqual(['Open position', ''])
    expect(wrapper.findAll('[data-test="option-correct"][aria-pressed="true"]')).toHaveLength(1)
  })

  it('opens the image picker for an option, previews it locally, and defers upload', async () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })
    const file = new File(['data'], 'new.png', { type: 'image/png' })

    await wrapper.findAll('[data-test="choose-image"]')[1]!.trigger('click')
    expect(wrapper.find('[data-test="image-picker-modal"]').exists()).toBe(true)

    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', file)

    expect(wrapper.emitted('setPreview')).toEqual([['o2', 'blob:local-preview']])
    expect(wrapper.emitted('setFile')).toEqual([['o2', file]])
    expect(wrapper.find('[data-test="image-picker-modal"]').exists()).toBe(false)
  })

  it('emits caption edits, toggle, remove, and add', async () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })

    await wrapper.findAll('input[type="text"]')[1]!.setValue('Barre chord')
    expect(wrapper.emitted('editCaption')).toEqual([['o2', 'Barre chord']])

    await wrapper.findAll('[data-test="option-correct"]')[1]!.trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['o2']])

    await wrapper.findAll('[data-test="option-remove"]')[0]!.trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['o1']])

    await wrapper.get('[data-test="add-option"]').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })
})
