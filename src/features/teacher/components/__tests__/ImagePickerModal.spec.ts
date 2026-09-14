import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const upload = vi.fn()
vi.mock('@/features/teacher/composables/useMediaUpload', () => ({
  useMediaUpload: () => ({ upload }),
}))

import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'

describe('ImagePickerModal', () => {
  it('does not render when closed', () => {
    const wrapper = mount(ImagePickerModal, { props: { open: false } })

    expect(wrapper.find('[data-test="image-picker-modal"]').exists()).toBe(false)
  })

  it('uploads the chosen file and emits select with the object_url', async () => {
    upload.mockResolvedValueOnce('https://cdn.example.com/library/abc.png')
    const wrapper = mount(ImagePickerModal, { props: { open: true } })

    const file = new File(['data'], 'diagram.png', { type: 'image/png' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(upload).toHaveBeenCalledWith(file, 'image')
    expect(wrapper.emitted('select')).toEqual([['https://cdn.example.com/library/abc.png']])
  })

  it('emits close from the close button', async () => {
    const wrapper = mount(ImagePickerModal, { props: { open: true } })

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows an error message when the upload fails', async () => {
    upload.mockRejectedValueOnce(new Error('Upload failed with status 500'))
    const wrapper = mount(ImagePickerModal, { props: { open: true } })

    const file = new File(['data'], 'diagram.png', { type: 'image/png' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(wrapper.text()).toContain('Upload failed with status 500')
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
