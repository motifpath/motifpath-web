import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'

describe('ImagePickerModal', () => {
  it('does not render when closed', () => {
    const wrapper = mount(ImagePickerModal, { props: { open: false } })

    expect(wrapper.find('[data-test="image-picker-modal"]').exists()).toBe(false)
  })

  it('emits select with the raw file, without uploading it', async () => {
    const wrapper = mount(ImagePickerModal, { props: { open: true } })

    const file = new File(['data'], 'diagram.png', { type: 'image/png' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')

    expect(wrapper.emitted('select')).toEqual([[file]])
  })

  it('accepts only audio files when kind is audio', () => {
    const wrapper = mount(ImagePickerModal, { props: { open: true, kind: 'audio' } })

    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('audio/*')
    expect(wrapper.text()).toContain('Choose an audio file')
  })

  it('emits close from the close button', async () => {
    const wrapper = mount(ImagePickerModal, { props: { open: true } })

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
