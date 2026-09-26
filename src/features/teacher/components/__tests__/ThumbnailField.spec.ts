import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const uploadThumbnail = vi.fn()
vi.mock('@/features/teacher/composables/useMediaUpload', () => ({
  useMediaUpload: () => ({ uploadThumbnail }),
}))

import ThumbnailField from '@/features/teacher/components/ThumbnailField.vue'
import { useToast } from '@/shared/composables/useToast'

function pickFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change'))
}

describe('ThumbnailField', () => {
  beforeEach(() => {
    uploadThumbnail.mockReset()
    useToast().clear()
  })

  it('shows the placeholder and an upload control when there is no thumbnail', () => {
    const wrapper = mount(ThumbnailField, { props: { modelValue: undefined } })

    expect(wrapper.find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="thumbnail-upload"]').text()).toBe('Upload image')
    expect(wrapper.find('[data-test="thumbnail-remove"]').exists()).toBe(false)
  })

  it('previews the thumbnail and offers to replace or remove it', () => {
    const wrapper = mount(ThumbnailField, { props: { modelValue: 'https://cdn.test/t.png' } })

    expect(wrapper.get('img').attributes('src')).toBe('https://cdn.test/t.png')
    expect(wrapper.get('[data-test="thumbnail-upload"]').text()).toBe('Replace image')
    expect(wrapper.find('[data-test="thumbnail-remove"]').exists()).toBe(true)
  })

  it('uploads a picked image and emits its url', async () => {
    uploadThumbnail.mockResolvedValueOnce('https://cdn.test/thumbnails/new.png')
    const wrapper = mount(ThumbnailField, { props: { modelValue: undefined } })
    const file = new File(['x'], 'cover.png', { type: 'image/png' })

    pickFile(wrapper.get<HTMLInputElement>('[data-test="thumbnail-file-input"]').element, file)
    await flushPromises()

    expect(uploadThumbnail).toHaveBeenCalledWith(file)
    expect(wrapper.emitted('update:modelValue')).toEqual([['https://cdn.test/thumbnails/new.png']])
  })

  it('shows the upload in progress and blocks another one meanwhile', async () => {
    let finish: (url: string) => void = () => {}
    uploadThumbnail.mockReturnValueOnce(new Promise<string>((resolve) => (finish = resolve)))
    const wrapper = mount(ThumbnailField, { props: { modelValue: undefined } })

    pickFile(
      wrapper.get<HTMLInputElement>('[data-test="thumbnail-file-input"]').element,
      new File(['x'], 'cover.png', { type: 'image/png' }),
    )
    await flushPromises()

    expect(wrapper.get('[data-test="thumbnail-upload"]').text()).toBe('Uploading…')
    expect(wrapper.get('[data-test="thumbnail-file-input"]').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('uploading')).toEqual([[true]])

    finish('https://cdn.test/thumbnails/new.png')
    await flushPromises()
    expect(wrapper.get('[data-test="thumbnail-file-input"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.emitted('uploading')).toEqual([[true], [false]])
  })

  it('keeps the current thumbnail and reports the error when the upload fails', async () => {
    uploadThumbnail.mockRejectedValueOnce(new Error('Upload failed with status 403'))
    const wrapper = mount(ThumbnailField, { props: { modelValue: 'https://cdn.test/t.png' } })

    pickFile(
      wrapper.get<HTMLInputElement>('[data-test="thumbnail-file-input"]').element,
      new File(['x'], 'cover.png', { type: 'image/png' }),
    )
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(useToast().toasts.value.map((toast) => toast.message)).toEqual(['Upload failed with status 403'])
  })

  it('removes the thumbnail', async () => {
    const wrapper = mount(ThumbnailField, { props: { modelValue: 'https://cdn.test/t.png' } })

    await wrapper.get('[data-test="thumbnail-remove"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[undefined]])
  })

  it('cannot be changed while disabled', () => {
    const wrapper = mount(ThumbnailField, { props: { modelValue: 'https://cdn.test/t.png', disabled: true } })

    expect(wrapper.get('[data-test="thumbnail-file-input"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="thumbnail-remove"]').exists()).toBe(false)
  })
})
