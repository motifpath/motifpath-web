import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramSequenceEditor from '@/features/teacher/components/DiagramSequenceEditor.vue'
import { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { useDiagramSequence } from '@/features/teacher/composables/useDiagramSequence'
import { makeFrettedDiagram, makePlayback, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'

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
  it('lists every step with what it sounds and, as a note or rest icon, for how long', () => {
    const { wrapper } = mountEditor()
    const labels = wrapper.findAll('[data-test="sequence-step"]').map((step) => step.attributes('aria-label'))

    expect(stepTexts(wrapper)[0]).toContain('R')
    expect(stepTexts(wrapper)[3]).toMatch(/R.*4.*5/)
    expect(labels).toEqual([
      'Step 1: R, Eighth',
      'Step 2: b3, Eighth',
      'Step 3: Rest, Eighth',
      'Step 4: R 4 5, Quarter',
    ])
    const steps = wrapper.findAll('[data-test="sequence-step"]')
    expect(steps[0]!.find('[data-test="note-head"]').exists()).toBe(true)
    expect(steps[2]!.find('[data-test="rest-8"]').exists()).toBe(true)
  })

  it('draws a bar line where a new bar starts', () => {
    const { wrapper } = mountEditor(
      makeSequencedFrettedDiagram(
        {},
        {
          steps: [
            { position_ids: ['p0'], value: { num: 1, den: 2 }, strum: 'none' },
            { position_ids: ['p1'], value: { num: 1, den: 2 }, strum: 'none' },
            { position_ids: ['p2'], value: { num: 1, den: 4 }, strum: 'none' },
          ],
        },
      ),
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

  it('shows the tempo that is kept when one typed is out of range', async () => {
    const { form, wrapper } = mountEditor(makeSequencedFrettedDiagram({}, { tempo_bpm: 300 }))
    const tempo = wrapper.get('[data-test="sequence-tempo"]')

    await tempo.setValue('500')

    expect(form.tempoBpm.value).toBe(300)
    expect((tempo.element as HTMLInputElement).value).toBe('300')
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

  it('has no tempo to edit while the diagram has no playback', () => {
    const { wrapper } = mountEditor(makeFrettedDiagram())

    expect(wrapper.get('[data-test="sequence-tempo"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="sequence-empty"]').exists()).toBe(true)
  })

  it('fills an empty playback from the positions', async () => {
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

  it('shows each note value as its notation icon, named for screen readers', () => {
    const { wrapper } = mountEditor()

    const quarter = wrapper.get('[data-test="sequence-value-4"]')
    expect(quarter.find('svg').attributes('aria-label')).toBe('Quarter')
    expect(quarter.find('[data-test="note-head"]').exists()).toBe(true)
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

  it('adds a rest of the value clicked, in one click', async () => {
    const { form, wrapper } = mountEditor()

    const halfRest = wrapper.get('[data-test="sequence-rest-2"]')
    expect(halfRest.attributes('aria-label')).toBe('Add half rest')
    await halfRest.trigger('click')

    expect(form.sequence.value.at(-1)).toEqual({ position_ids: [], value: { num: 1, den: 2 }, strum: 'none' })
  })

  describe('dragging steps', () => {
    const drag = async (wrapper: ReturnType<typeof mount>, from: number) =>
      wrapper.findAll('[data-test="sequence-step"]')[from]!.trigger('dragstart')

    it('moves a step dropped into a gap between steps', async () => {
      const { form, wrapper } = mountEditor()

      await drag(wrapper, 0)
      await wrapper.findAll('[data-test="sequence-gap"]')[3]!.trigger('drop')

      expect(form.sequence.value.map((step) => step.position_ids)).toEqual([['p1'], [], ['p0'], ['p0', 'p2', 'p3']])
    })

    it('has a gap before the first step and after the last', () => {
      const { wrapper } = mountEditor()

      expect(wrapper.findAll('[data-test="sequence-gap"]')).toHaveLength(5)
    })

    it('makes a chord of a step dropped onto another', async () => {
      const { form, wrapper } = mountEditor()

      await drag(wrapper, 1)
      await wrapper.findAll('[data-test="sequence-step"]')[3]!.trigger('drop')

      expect(form.sequence.value.at(-1)?.position_ids).toEqual(['p0', 'p1', 'p2', 'p3'])
    })

    it('does nothing when a drag ends without a drop', async () => {
      const { form, wrapper } = mountEditor()
      const before = JSON.stringify(form.sequence.value)

      await drag(wrapper, 1)
      await wrapper.findAll('[data-test="sequence-step"]')[1]!.trigger('dragend')
      await wrapper.findAll('[data-test="sequence-gap"]')[0]!.trigger('drop')

      expect(JSON.stringify(form.sequence.value)).toBe(before)
    })
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

  it('removes a step straight from its card, without selecting it', async () => {
    const { form, editor, wrapper } = mountEditor()

    const remove = wrapper.findAll('[data-test="sequence-step-remove"]')[1]!
    expect(remove.attributes('aria-label')).toBe('Remove step 2')
    await remove.trigger('click')

    expect(form.sequence.value.map((step) => step.position_ids)).toEqual([['p0'], [], ['p0', 'p2', 'p3']])
    expect(editor.selectedIndex.value).toBeNull()
  })

  it('keeps the selection on the same step when an earlier one is removed from its card', async () => {
    const { editor, wrapper } = mountEditor()
    await wrapper.findAll('[data-test="sequence-step"]')[3]!.trigger('click')

    await wrapper.findAll('[data-test="sequence-step-remove"]')[0]!.trigger('click')

    expect(editor.selectedIndex.value).toBe(2)
    expect(editor.selectedPositionIds.value).toEqual(['p0', 'p2', 'p3'])
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

  describe('playbacks', () => {
    const strum = makePlayback({
      playback_id: 'pb-strum',
      names: { en: 'Strum', pt_BR: 'Batida' },
      steps: [{ position_ids: ['p0', 'p2'], value: { num: 1, den: 1 }, strum: 'down' }],
    })
    const arpeggio = makePlayback({
      playback_id: 'pb-arpeggio',
      names: { en: 'Arpeggio', pt_BR: 'Arpejo' },
      steps: [
        { position_ids: ['p0'], value: { num: 1, den: 4 }, strum: 'none' },
        { position_ids: ['p2'], value: { num: 1, den: 4 }, strum: 'none' },
      ],
    })
    const twoPlaybacks = () => makeFrettedDiagram({ playbacks: [strum, arpeggio], default_playback_id: 'pb-strum' })
    const items = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('[data-test="playback-item"]')

    it('lists the playbacks by name, in order, marking the default and the one being edited', () => {
      const { wrapper } = mountEditor(twoPlaybacks())

      expect(items(wrapper).map((item) => item.find('[data-test="playback-select"]').text())).toEqual(['Strum', 'Arpeggio'])
      expect(items(wrapper)[0]!.find('[data-test="playback-default-badge"]').exists()).toBe(true)
      expect(items(wrapper)[1]!.find('[data-test="playback-default-badge"]').exists()).toBe(false)
      expect(items(wrapper)[0]!.get('[data-test="playback-select"]').attributes('aria-pressed')).toBe('true')
      expect(stepTexts(wrapper)).toHaveLength(1)
    })

    it("shows a playback's steps once it's chosen, and records into it, leaving the others unchanged", async () => {
      const { editor, form, wrapper } = mountEditor(twoPlaybacks())

      await items(wrapper)[1]!.get('[data-test="playback-select"]').trigger('click')
      expect(stepTexts(wrapper)).toHaveLength(2)
      editor.pickPosition('p3')

      expect(form.playbacks.value[1]!.steps).toHaveLength(3)
      expect(form.playbacks.value[0]!.steps).toEqual(strum.steps)
    })

    it('adds a playback and edits it', async () => {
      const { form, wrapper } = mountEditor(twoPlaybacks())

      await wrapper.get('[data-test="playback-add"]').trigger('click')

      expect(items(wrapper)).toHaveLength(3)
      expect(items(wrapper)[2]!.get('[data-test="playback-select"]').attributes('aria-pressed')).toBe('true')
      expect(form.selectedPlaybackId.value).toBe(form.playbacks.value[2]!.id)
    })

    it("renames the edited playback in each of the diagram's languages", async () => {
      const { form, wrapper } = mountEditor(twoPlaybacks())

      await wrapper.get('[data-test="playback-name-pt_BR"]').setValue('Batida para baixo')

      expect(form.playbacks.value[0]!.names).toEqual({ en: 'Strum', pt_BR: 'Batida para baixo' })
    })

    it('reorders the edited playback', async () => {
      const { form, wrapper } = mountEditor(twoPlaybacks())
      expect(wrapper.get('[data-test="playback-move-earlier"]').attributes('disabled')).toBeDefined()

      await wrapper.get('[data-test="playback-move-later"]').trigger('click')

      expect(form.playbacks.value.map((p) => p.id)).toEqual(['pb-arpeggio', 'pb-strum'])
    })

    it('makes another playback the default', async () => {
      const { form, wrapper } = mountEditor(twoPlaybacks())
      expect(wrapper.find('[data-test="playback-make-default"]').exists()).toBe(false)

      await items(wrapper)[1]!.get('[data-test="playback-select"]').trigger('click')
      await wrapper.get('[data-test="playback-make-default"]').trigger('click')

      expect(form.defaultPlaybackId.value).toBe('pb-arpeggio')
      expect(items(wrapper)[1]!.find('[data-test="playback-default-badge"]').exists()).toBe(true)
    })

    it('removes the edited playback', async () => {
      const { form, wrapper } = mountEditor(twoPlaybacks())

      await wrapper.get('[data-test="playback-remove"]').trigger('click')

      expect(form.playbacks.value.map((p) => p.id)).toEqual(['pb-arpeggio'])
      expect(items(wrapper)).toHaveLength(1)
    })

    it('says a playback with no steps must get one before the diagram can be saved', async () => {
      const { wrapper } = mountEditor(twoPlaybacks())

      await wrapper.get('[data-test="playback-add"]').trigger('click')

      expect(wrapper.find('[data-test="playback-needs-steps"]').exists()).toBe(true)
    })

    it('marks a playback with no steps in the list even while another is being edited', async () => {
      const { wrapper } = mountEditor(twoPlaybacks())

      await wrapper.get('[data-test="playback-add"]').trigger('click')
      await items(wrapper)[0]!.get('[data-test="playback-select"]').trigger('click')

      expect(wrapper.find('[data-test="playback-needs-steps"]').exists()).toBe(false)
      const marked = items(wrapper).map((item) => item.find('[data-test="playback-needs-steps-badge"]').exists())
      expect(marked).toEqual([false, false, true])
      expect(items(wrapper)[2]!.get('[data-test="playback-needs-steps-badge"]').attributes('aria-label')).toBe(
        'Add at least one step, or remove this playback, before saving.',
      )
    })

    it('offers no further playback once the diagram has the most it may have, saying why', async () => {
      const { form, wrapper } = mountEditor(twoPlaybacks())
      for (let i = 0; i < 14; i++) form.addPlayback()
      await wrapper.vm.$nextTick()

      const add = wrapper.get('[data-test="playback-add"]')
      expect(add.attributes('disabled')).toBeDefined()
      expect(add.attributes('title')).toBe('A diagram can have at most 16 playbacks.')
    })

    it('lists no playbacks for a diagram without any, offering to add one', () => {
      const { wrapper } = mountEditor(makeFrettedDiagram())

      expect(items(wrapper)).toHaveLength(0)
      expect(wrapper.find('[data-test="playback-add"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="playback-remove"]').exists()).toBe(false)
    })
  })
})
