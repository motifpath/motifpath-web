import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AudioSelectionOptionsEditor from '@/features/teacher/components/AudioSelectionOptionsEditor.vue'
import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import type { AudioOption } from '@/features/teacher/composables/useExerciseForm'

const revokeObjectURL = vi.fn()
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
  revokeObjectURL,
})

const options: AudioOption[] = [
  { id: 'o1', audioUrl: 'https://cdn.example.com/a.mp3', label: 'Lick A', correct: true },
  { id: 'o2', audioUrl: '', label: '', correct: false },
]

describe('AudioSelectionOptionsEditor', () => {
  beforeEach(() => {
    revokeObjectURL.mockClear()
  })

  it('renders the correct state per option', () => {
    const wrapper = mount(AudioSelectionOptionsEditor, { props: { options } })

    expect(wrapper.findAll('[data-test="option-correct"][aria-pressed="true"]')).toHaveLength(1)
  })

  it('renders an audio player once an option has an audio clip', () => {
    const wrapper = mount(AudioSelectionOptionsEditor, { props: { options } })

    const players = wrapper.findAll('audio')
    expect(players).toHaveLength(1)
    expect(players[0]!.attributes('src')).toBe('https://cdn.example.com/a.mp3')
  })

  it("shows a 'Choose audio' placeholder when no clip has been picked yet", () => {
    const wrapper = mount(AudioSelectionOptionsEditor, { props: { options } })

    const chooseButton = wrapper.findAll('[data-test="choose-audio"]')[1]!
    expect(chooseButton.text()).toContain('Choose audio')
  })

  it('opens the audio picker for an option, previews it locally, and defers upload', async () => {
    const wrapper = mount(AudioSelectionOptionsEditor, { props: { options } })
    const file = new File(['data'], 'new.mp3', { type: 'audio/mpeg' })

    await wrapper.findAll('[data-test="choose-audio"]')[1]!.trigger('click')
    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(true)

    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', file)

    expect(wrapper.emitted('setPreview')).toEqual([['o2', 'blob:new.mp3']])
    expect(wrapper.emitted('setFile')).toEqual([['o2', file]])
    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false)
  })

  it('shows a label text input per option, seeded with its current label, and emits editLabel on input', async () => {
    const wrapper = mount(AudioSelectionOptionsEditor, { props: { options } })

    const inputs = wrapper.findAll('[data-test="option-label"]')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('Lick A')

    await inputs[1]!.setValue('Lick B')

    expect(wrapper.emitted('editLabel')).toEqual([['o2', 'Lick B']])
  })

  it('revokes the previous blob preview when an option clip is replaced', async () => {
    const blobOptions: AudioOption[] = [{ id: 'o1', audioUrl: 'blob:old-preview.mp3', label: '', correct: false }]
    const wrapper = mount(AudioSelectionOptionsEditor, { props: { options: blobOptions } })

    await wrapper.get('[data-test="choose-audio"]').trigger('click')
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', new File(['data'], 'new.mp3'))

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:old-preview.mp3')
  })

  it('does not try to revoke a real (non-blob) CDN URL when an option clip is replaced', async () => {
    const wrapper = mount(AudioSelectionOptionsEditor, { props: { options } })

    await wrapper.findAll('[data-test="choose-audio"]')[0]!.trigger('click')
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', new File(['data'], 'new.mp3'))

    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('emits toggle, remove, and add', async () => {
    const wrapper = mount(AudioSelectionOptionsEditor, { props: { options } })

    await wrapper.findAll('[data-test="option-correct"]')[1]!.trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['o2']])

    await wrapper.findAll('[data-test="option-remove"]')[0]!.trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['o1']])

    await wrapper.get('[data-test="add-option"]').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('uses a 3-column grid by default and 2 columns when compact', () => {
    const wide = mount(AudioSelectionOptionsEditor, { props: { options } })
    expect(wide.classes()).toContain('grid-cols-3')

    const narrow = mount(AudioSelectionOptionsEditor, { props: { options, compact: true } })
    expect(narrow.classes()).toContain('grid-cols-2')
  })
})
