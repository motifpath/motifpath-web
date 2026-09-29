import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ImageChoiceOptionsEditor from '@/features/teacher/components/ImageChoiceOptionsEditor.vue'
import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import MediaPickerModal from '@/features/teacher/components/MediaPickerModal.vue'
import type { ImageOption } from '@/features/teacher/composables/useExerciseForm'

const revokeObjectURL = vi.fn()
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
  revokeObjectURL,
})

const options: ImageOption[] = [
  { id: 'o1', imageUrl: 'https://cdn.example.com/a.png', correct: true },
  { id: 'o2', imageUrl: '', correct: false },
]

describe('ImageChoiceOptionsEditor', () => {
  beforeEach(() => {
    revokeObjectURL.mockClear()
  })

  it('renders the correct state per option', () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })

    expect(wrapper.findAll('[data-test="option-correct"][aria-pressed="true"]')).toHaveLength(1)
  })

  it('marks the option image non-draggable, so an accidental drag gesture cannot swallow a click on the controls above it', () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })

    const img = wrapper.find('img')
    expect(img.attributes('draggable')).toBe('false')
  })

  it("shows the picked image uncropped (object-contain), not cropped to fill the box (object-cover)", () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })

    const img = wrapper.get('img')
    expect(img.classes()).not.toContain('object-cover')
    expect(img.classes()).toContain('object-contain')
  })

  it('leaves the choose-image button transparent so the picked image shows through, with no text label covering it', () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })

    const chooseButton = wrapper.findAll('[data-test="choose-media"]')[0]!
    expect(chooseButton.classes()).not.toContain('bg-surface-sunken')
    expect(chooseButton.text()).not.toContain('Change image')
  })

  it("shows a 'Choose image' placeholder when no image has been picked yet", () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })

    const chooseButton = wrapper.findAll('[data-test="choose-media"]')[1]!
    expect(chooseButton.text()).toContain('Choose image or diagram')
  })

  it('opens the image picker for an option, previews it locally, and defers upload', async () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })
    const file = new File(['data'], 'new.png', { type: 'image/png' })

    await wrapper.findAll('[data-test="choose-media"]')[1]!.trigger('click')
    expect(wrapper.getComponent(MediaPickerModal).props('open')).toBe(true)

    await wrapper.findComponent(MediaPickerModal).vm.$emit('image', file)

    expect(wrapper.emitted('setPreview')).toEqual([['o2', 'blob:new.png']])
    expect(wrapper.emitted('setFile')).toEqual([['o2', file]])
    expect(wrapper.getComponent(MediaPickerModal).props('open')).toBe(false)
  })

  it('revokes the previous blob preview when an option image is replaced', async () => {
    const blobOptions: ImageOption[] = [{ id: 'o1', imageUrl: 'blob:old-preview.png', correct: false }]
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options: blobOptions } })

    await wrapper.get('[data-test="choose-media"]').trigger('click')
    await wrapper.findComponent(MediaPickerModal).vm.$emit('image', new File(['data'], 'new.png'))

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:old-preview.png')
  })

  it('does not try to revoke a real (non-blob) CDN URL when an option image is replaced', async () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })

    await wrapper.findAll('[data-test="choose-media"]')[0]!.trigger('click')
    await wrapper.findComponent(MediaPickerModal).vm.$emit('image', new File(['data'], 'new.png'))

    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('emits toggle, remove, and add', async () => {
    const wrapper = mount(ImageChoiceOptionsEditor, { props: { options } })

    await wrapper.findAll('[data-test="option-correct"]')[1]!.trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['o2']])

    await wrapper.findAll('[data-test="option-remove"]')[0]!.trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['o1']])

    await wrapper.get('[data-test="add-option"]').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('uses a 3-column grid by default and 2 columns when compact', () => {
    const wide = mount(ImageChoiceOptionsEditor, { props: { options } })
    expect(wide.classes()).toContain('grid-cols-3')

    const narrow = mount(ImageChoiceOptionsEditor, { props: { options, compact: true } })
    expect(narrow.classes()).toContain('grid-cols-2')
  })

  describe('diagram options', () => {
    const chord = { diagram_id: 'd-e-major', layers: { intervals: true, subset: null } }
    const stubs = { global: { stubs: { MediaPickerModal: true, EmbeddedDiagram: true } } }

    it('shows an option that is a diagram as that diagram, not an image, drawn compact to fit its tile', () => {
      const wrapper = mount(ImageChoiceOptionsEditor, {
        props: { options: [{ id: 'o1', imageUrl: '', diagramRef: chord, correct: false }] },
        ...stubs,
      })

      expect(wrapper.getComponent(EmbeddedDiagram).props()).toEqual(
        expect.objectContaining({ embed: { kind: 'single', ref: chord }, inert: true, compact: true }),
      )
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('picks a diagram for an option in the image-or-diagram picker', async () => {
      const wrapper = mount(ImageChoiceOptionsEditor, { props: { options }, ...stubs })

      await wrapper.findAll('[data-test="choose-media"]')[1]!.trigger('click')
      const modal = wrapper.getComponent(MediaPickerModal)
      expect(modal.props()).toEqual(expect.objectContaining({ open: true, initialDiagram: null }))

      modal.vm.$emit('diagram', chord)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('setDiagram')).toEqual([['o2', chord]])
      expect(wrapper.getComponent(MediaPickerModal).props('open')).toBe(false)
    })

    it('reopens an option’s own diagram for editing', async () => {
      const wrapper = mount(ImageChoiceOptionsEditor, {
        props: { options: [{ id: 'o1', imageUrl: '', diagramRef: chord, correct: false }] },
        ...stubs,
      })

      await wrapper.get('[data-test="choose-media"]').trigger('click')

      expect(wrapper.getComponent(MediaPickerModal).props()).toEqual(
        expect.objectContaining({ open: true, initialDiagram: chord }),
      )
    })
  })
})
