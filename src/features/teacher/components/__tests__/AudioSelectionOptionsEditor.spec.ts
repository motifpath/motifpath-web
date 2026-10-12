import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AudioSelectionOptionsEditor from '@/features/teacher/components/AudioSelectionOptionsEditor.vue'
import type { AudioOption } from '@/features/teacher/composables/useExerciseForm'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const revokeObjectURL = vi.fn()
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
  revokeObjectURL,
})

const strum: DiagramRef = {
  diagram_id: 'a-minor',
  layers: { intervals: true },
  playback: { playback_id: 'strum', direction: 'as_authored', loop: false },
}

const options: AudioOption[] = [
  { id: 'o1', audioUrl: 'https://cdn.example.com/a.mp3', label: 'Sound 1', correct: true },
  { id: 'o2', audioUrl: '', label: 'Sound 2', correct: false },
  { id: 'o3', audioUrl: '', diagramRef: strum, label: 'Sound 3', correct: false },
]

// The sound row and the picker have their own specs; here only what the editor hands them and does
// with what they say.
const stubs = {
  SoundSource: { name: 'SoundSource', props: ['sound', 'title'], emits: ['file', 'diagram', 'edit', 'remove'], template: '<div data-test="sound-source" />' },
  SoundPickerModal: { name: 'SoundPickerModal', props: ['open', 'initial'], emits: ['apply', 'close'], template: '<div />' },
}

function mountEditor(props: { options?: AudioOption[]; compact?: boolean } = {}) {
  return mount(AudioSelectionOptionsEditor, { props: { options, ...props }, global: { stubs } })
}

const sources = (wrapper: ReturnType<typeof mountEditor>) => wrapper.findAllComponents({ name: 'SoundSource' })

describe('AudioSelectionOptionsEditor', () => {
  beforeEach(() => {
    revokeObjectURL.mockClear()
  })

  it('renders the correct state per option', () => {
    const wrapper = mountEditor()
    expect(wrapper.findAll('[data-test="option-correct"][aria-pressed="true"]')).toHaveLength(1)
  })

  it('gives each option its sound: a file, none yet, or a diagram, mixed', () => {
    const wrapper = mountEditor()
    expect(sources(wrapper).map((source) => [source.props('sound'), source.props('title')])).toEqual([
      [{ kind: 'file', url: 'https://cdn.example.com/a.mp3' }, 'Sound 1'],
      [null, 'Sound 2'],
      [{ kind: 'diagram', ref: strum }, 'Sound 3'],
    ])
  })

  it('previews a picked file locally and defers its upload', async () => {
    const wrapper = mountEditor()
    const file = new File(['data'], 'new.mp3', { type: 'audio/mpeg' })

    await sources(wrapper)[1]!.vm.$emit('file', file)

    expect(wrapper.emitted('setPreview')).toEqual([['o2', 'blob:new.mp3']])
    expect(wrapper.emitted('setFile')).toEqual([['o2', file]])
  })

  it('revokes the previous blob preview when an option’s file is replaced, but never a stored URL', async () => {
    const wrapper = mountEditor({ options: [{ id: 'o0', audioUrl: 'blob:old.mp3', label: 'Sound 1', correct: false }, options[0]!] })

    await sources(wrapper)[0]!.vm.$emit('file', new File(['data'], 'new.mp3'))
    await sources(wrapper)[1]!.vm.$emit('file', new File(['data'], 'other.mp3'))

    expect(revokeObjectURL.mock.calls).toEqual([['blob:old.mp3']])
  })

  it('takes an option’s sound from a diagram', async () => {
    const wrapper = mountEditor()

    await sources(wrapper)[1]!.vm.$emit('diagram')
    const picker = wrapper.getComponent({ name: 'SoundPickerModal' })
    expect(picker.props()).toMatchObject({ open: true, initial: null })
    await picker.vm.$emit('apply', strum)

    expect(wrapper.emitted('setDiagram')).toEqual([['o2', strum]])
    expect(wrapper.getComponent({ name: 'SoundPickerModal' }).props('open')).toBe(false)
  })

  it('reopens a diagram sound’s settings', async () => {
    const wrapper = mountEditor()
    await sources(wrapper)[2]!.vm.$emit('edit')
    expect(wrapper.getComponent({ name: 'SoundPickerModal' }).props()).toMatchObject({ open: true, initial: strum })
  })

  it('removes an option’s sound, keeping the option', async () => {
    const wrapper = mountEditor()
    await sources(wrapper)[2]!.vm.$emit('remove')
    expect(wrapper.emitted('clearSound')).toEqual([['o3']])
    expect(wrapper.emitted('remove')).toBeUndefined()
  })

  it('shows the label students see, editable', async () => {
    const wrapper = mountEditor()
    const inputs = wrapper.findAll('[data-test="option-label"]')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('Sound 1')

    await inputs[1]!.setValue('Sound B')

    expect(wrapper.emitted('editLabel')).toEqual([['o2', 'Sound B']])
  })

  it('emits toggle, remove, and add', async () => {
    const wrapper = mountEditor()

    await wrapper.findAll('[data-test="option-correct"]')[1]!.trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['o2']])

    await wrapper.findAll('[data-test="option-remove"]')[0]!.trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['o1']])

    await wrapper.get('[data-test="add-option"]').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('gives each option a row of its own at every size, since a sound row needs the width', () => {
    expect(mountEditor().classes()).toContain('grid-cols-1')
    expect(mountEditor({ compact: true }).classes()).toContain('grid-cols-1')
  })
})
