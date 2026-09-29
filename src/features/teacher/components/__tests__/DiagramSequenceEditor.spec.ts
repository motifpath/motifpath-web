import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramSequenceEditor from '@/features/teacher/components/DiagramSequenceEditor.vue'
import { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { useDiagramSequence } from '@/features/teacher/composables/useDiagramSequence'
import { makeFrettedDiagram, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'

function mountEditor(diagram = makeSequencedFrettedDiagram()) {
  const form = useDiagramForm()
  form.loadFromDiagram(diagram)
  form.rootNote.value = diagram.root_note ?? ''
  form.tuning.value = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  const editor = useDiagramSequence(form)
  const wrapper = mount(DiagramSequenceEditor, { props: { form, editor, labelMode: 'interval' } })
  return { form, editor, wrapper }
}

const stepTexts = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-test="sequence-step"]').map((step) => step.text())

describe('DiagramSequenceEditor', () => {
  it('lists every step with what it sounds and for how long', () => {
    const { wrapper } = mountEditor()

    expect(stepTexts(wrapper)).toEqual([
      expect.stringContaining('R'),
      expect.stringContaining('b3'),
      expect.stringContaining('Rest'),
      expect.stringMatching(/R.*4.*5/),
    ])
    expect(stepTexts(wrapper)[0]).toContain('Eighth')
    expect(stepTexts(wrapper)[3]).toContain('Quarter')
  })

  it('draws a bar line where a new bar starts', () => {
    const { wrapper } = mountEditor(
      makeSequencedFrettedDiagram({
        sequence: [
          { position_ids: ['p0'], value: { num: 1, den: 2 }, strum: 'none' },
          { position_ids: ['p1'], value: { num: 1, den: 2 }, strum: 'none' },
          { position_ids: ['p2'], value: { num: 1, den: 4 }, strum: 'none' },
        ],
      }),
    )

    expect(wrapper.findAll('[data-test="sequence-bar-line"]')).toHaveLength(1)
  })

  it('shows the tempo, time signature and mode, and edits them', async () => {
    const { form, wrapper } = mountEditor()

    expect((wrapper.get('[data-test="sequence-tempo"]').element as HTMLInputElement).value).toBe('90')
    await wrapper.get('[data-test="sequence-tempo"]').setValue('120')
    await wrapper.get('[data-test="sequence-beats"]').setValue('6')
    await wrapper.get('[data-test="sequence-beat-value"]').setValue('8')
    await wrapper.get('[data-test="sequence-mode"]').setValue('dorian')

    expect(form.tempoBpm.value).toBe(120)
    expect(form.timeSignature.value).toEqual({ beats: 6, beat_value: 8 })
    expect(form.mode.value).toBe('dorian')
  })

  it('clears the mode when “no key” is chosen', async () => {
    const { form, wrapper } = mountEditor()

    await wrapper.get('[data-test="sequence-mode"]').setValue('')

    expect(form.mode.value).toBeNull()
  })

  it('offers no mode until the diagram has a root note', () => {
    const { wrapper } = mountEditor(makeFrettedDiagram({ root_note: null, mode: null }))

    expect(wrapper.get('[data-test="sequence-mode"]').attributes('disabled')).toBeDefined()
  })

  it('has no tempo to edit while nothing plays', () => {
    const { wrapper } = mountEditor(makeFrettedDiagram())

    expect(wrapper.get('[data-test="sequence-tempo"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="sequence-empty"]').exists()).toBe(true)
  })

  it('fills an empty sequence from the positions', async () => {
    const { form, wrapper } = mountEditor(makeFrettedDiagram())

    await wrapper.get('[data-test="sequence-fill"]').trigger('click')

    expect(form.sequence.value).toHaveLength(6)
    expect(wrapper.find('[data-test="sequence-fill"]').exists()).toBe(false)
  })

  it('turns recording on, and chords only while recording', async () => {
    const { editor, wrapper } = mountEditor()
    expect(wrapper.get('[data-test="sequence-chord"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="sequence-record"]').trigger('click')
    expect(editor.recording.value).toBe(true)
    expect(wrapper.get('[data-test="sequence-record"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-test="sequence-chord"]').trigger('click')
    expect(editor.chord.value).toBe(true)
  })

  it('picks the note value from the palette, with a dot or as a triplet', async () => {
    const { editor, wrapper } = mountEditor()

    await wrapper.get('[data-test="sequence-value-16"]').trigger('click')
    await wrapper.get('[data-test="sequence-tuplet-3"]').trigger('click')

    expect(editor.currentValue.value).toEqual({ num: 1, den: 24 })
    expect(wrapper.get('[data-test="sequence-value-16"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-test="sequence-tuplet-3"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-test="sequence-dotted"]').trigger('click')
    expect(editor.currentValue.value).toEqual({ num: 3, den: 32 })
  })

  it('adds a rest', async () => {
    const { form, wrapper } = mountEditor()

    await wrapper.get('[data-test="sequence-rest"]').trigger('click')

    expect(form.sequence.value.at(-1)?.position_ids).toEqual([])
  })

  it('edits the selected step: strum a chord, move it, remove it', async () => {
    const { form, wrapper } = mountEditor()
    const steps = () => wrapper.findAll('[data-test="sequence-step"]')

    await steps()[3]!.trigger('click')
    expect(steps()[3]!.attributes('aria-pressed')).toBe('true')
    await wrapper.get('[data-test="sequence-strum"]').setValue('up')
    expect(form.sequence.value[3]?.strum).toBe('up')

    await wrapper.get('[data-test="sequence-move-earlier"]').trigger('click')
    expect(form.sequence.value[2]?.position_ids).toEqual(['p0', 'p2', 'p3'])

    await wrapper.get('[data-test="sequence-remove-step"]').trigger('click')
    expect(form.sequence.value).toHaveLength(3)
  })

  it('offers a strum only for a step of two or more positions', async () => {
    const { wrapper } = mountEditor()

    await wrapper.findAll('[data-test="sequence-step"]')[0]!.trigger('click')

    expect(wrapper.find('[data-test="sequence-strum"]').exists()).toBe(false)
  })

  it('clears the whole sequence', async () => {
    const { form, wrapper } = mountEditor()

    await wrapper.get('[data-test="sequence-clear"]').trigger('click')

    expect(form.sequence.value).toEqual([])
  })
})
