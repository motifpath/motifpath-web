import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ExerciseView from '@/shared/components/ExerciseView.vue'
import { makeDiagramRef } from '@/shared/testUtils/diagram'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']

const textOptions: Option[] = [
  { option_id: 'o1', label: 'Alternate picking', is_correct: true },
  { option_id: 'o2', label: 'Legato', is_correct: false },
]

const imageOptions: Option[] = [
  { option_id: 'i1', label: 'Open G chord', image_url: 'https://x/g.png', is_correct: true },
  { option_id: 'i2', label: 'Open C chord', image_url: 'https://x/c.png', is_correct: false },
]

const audioOptions: Option[] = [
  { option_id: 'a1', audio_url: 'https://x/lick1.mp3', label: 'Lick A', is_correct: true },
  { option_id: 'a2', audio_url: 'https://x/lick2.mp3', label: 'Lick B', is_correct: false },
]

const regionOptions: Option[] = [
  {
    option_id: 'r1',
    is_correct: true,
    region: { x: 0.2, y: 0.3, width: 0.1, height: 0.1, shape: 'circle' },
  },
]

describe('ExerciseView', () => {
  it('renders the prompt', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('Name this technique'), options: textOptions },
    })

    expect(wrapper.text()).toContain('Name this technique')
  })

  it('renders text_response options as selectable rows', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Alternate picking')
  })

  it('renders image_choice options as an image grid', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_choice', prompt: plainTextPrompt('p'), options: imageOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Open G chord')
  })

  it("shows the option image uncropped (object-contain), bounded so mixed aspect ratios don't produce a ragged grid", () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_choice', prompt: plainTextPrompt('p'), options: imageOptions },
    })

    const img = wrapper.get('[data-test="exercise-option"] img')
    expect(img.classes()).not.toContain('object-cover')
    expect(img.classes()).toContain('object-contain')
  })

  it('marks the image_choice option image non-draggable, so an accidental drag gesture cannot swallow the click', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_choice', prompt: plainTextPrompt('p'), options: imageOptions },
    })

    expect(wrapper.get('[data-test="exercise-option"] img').attributes('draggable')).toBe('false')
  })

  describe('audio_selection', () => {
    // jsdom has no real media pipeline — every click pauses/plays the shared
    // element, so both are stubbed for every test here, not just the ones
    // that assert on them.
    beforeEach(() => {
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('renders equally sized labeled buttons, with no visible native player', () => {
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: plainTextPrompt('p'), options: audioOptions },
      })

      const rows = wrapper.findAll('[data-test="exercise-option"]')
      expect(rows).toHaveLength(2)
      expect(rows[0]?.text()).toContain('Lick A')
      expect(rows[1]?.text()).toContain('Lick B')
      // A single shared, hidden player drives playback — not one <audio> per
      // option — so there is nothing resembling a native scrubber per button.
      expect(wrapper.findAll('audio')).toHaveLength(1)
      expect(wrapper.get('audio').attributes('controls')).toBeUndefined()
    })

    it('selects an audio_selection option on click', async () => {
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: plainTextPrompt('p'), options: audioOptions },
      })

      await wrapper.findAll('[data-test="exercise-option"]')[0]!.trigger('click')

      expect(wrapper.findAll('[data-test="exercise-option"]')[0]!.attributes('data-selected')).toBe('true')
    })

    it("plays the clicked option's clip through the shared player", async () => {
      const playSpy = vi.mocked(HTMLMediaElement.prototype.play)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: plainTextPrompt('p'), options: audioOptions },
      })

      await wrapper.findAll('[data-test="exercise-option"]')[0]!.trigger('click')

      const audioEl = wrapper.get('audio').element as HTMLAudioElement
      expect(audioEl.src).toBe('https://x/lick1.mp3')
      expect(playSpy).toHaveBeenCalledTimes(1)
    })

    it('stops the previously playing clip before playing a newly clicked option, so playback never overlaps', async () => {
      const pauseSpy = vi.mocked(HTMLMediaElement.prototype.pause)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: plainTextPrompt('p'), options: audioOptions },
      })

      await wrapper.findAll('[data-test="exercise-option"]')[0]!.trigger('click')
      await wrapper.findAll('[data-test="exercise-option"]')[1]!.trigger('click')

      expect(pauseSpy).toHaveBeenCalled()
      const audioEl = wrapper.get('audio').element as HTMLAudioElement
      expect(audioEl.src).toBe('https://x/lick2.mp3')
    })

    it('stops (does not restart) and unselects an option when it is clicked again while playing', async () => {
      const playSpy = vi.mocked(HTMLMediaElement.prototype.play)
      const pauseSpy = vi.mocked(HTMLMediaElement.prototype.pause)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: plainTextPrompt('p'), options: audioOptions },
      })
      const firstOption = wrapper.findAll('[data-test="exercise-option"]')[0]!

      await firstOption.trigger('click')
      expect(playSpy).toHaveBeenCalledTimes(1)

      await firstOption.trigger('click')

      expect(playSpy).toHaveBeenCalledTimes(1)
      expect(pauseSpy).toHaveBeenCalled()
      // The second click is both a stop and an unanswer, same as every other
      // exercise type's click-to-deselect behavior.
      expect(firstOption.attributes('data-selected')).toBe('false')
    })

    it('selects and plays again on a third click, after the second click stopped and unselected it', async () => {
      const playSpy = vi.mocked(HTMLMediaElement.prototype.play)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: plainTextPrompt('p'), options: audioOptions },
      })
      const firstOption = wrapper.findAll('[data-test="exercise-option"]')[0]!

      await firstOption.trigger('click')
      await firstOption.trigger('click')
      await firstOption.trigger('click')

      expect(firstOption.attributes('data-selected')).toBe('true')
      expect(playSpy).toHaveBeenCalledTimes(2)
    })

    it('plays again from the start after a clicked clip finished naturally', async () => {
      const playSpy = vi.mocked(HTMLMediaElement.prototype.play)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: plainTextPrompt('p'), options: audioOptions },
      })
      const firstOption = wrapper.findAll('[data-test="exercise-option"]')[0]!

      await firstOption.trigger('click')
      await wrapper.get('audio').trigger('ended')
      await firstOption.trigger('click')

      expect(playSpy).toHaveBeenCalledTimes(2)
    })
  })

  it('renders image_recognition options as click regions over the real stimulus image', () => {
    const wrapper = mount(ExerciseView, {
      props: {
        exerciseType: 'image_recognition',
        prompt: plainTextPrompt('p'),
        options: regionOptions,
        imageUrl: 'https://x/fretboard.png',
      },
    })

    expect(wrapper.findAll('[data-test="exercise-region"]')).toHaveLength(1)
    const img = wrapper.get('[data-test="exercise-stimulus-image"]')
    expect(img.attributes('src')).toBe('https://x/fretboard.png')
  })

  it('shows a placeholder instead of a region canvas when image_recognition has no stimulus image yet', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_recognition', prompt: plainTextPrompt('p'), options: regionOptions },
    })

    expect(wrapper.find('[data-test="exercise-stimulus-image"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="no-stimulus-image"]').exists()).toBe(true)
  })

  it('shows no visible marker over an unselected region, so the image underneath is never obscured', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_recognition', prompt: plainTextPrompt('p'), options: regionOptions, imageUrl: 'https://x/fretboard.png' },
    })

    expect(wrapper.find('[data-test="exercise-region-marker"]').exists()).toBe(false)
  })

  it('shows a small marker at the region, not a filled overlay across the whole region, once selected', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_recognition', prompt: plainTextPrompt('p'), options: regionOptions, imageUrl: 'https://x/fretboard.png' },
    })

    await wrapper.get('[data-test="exercise-region"]').trigger('click')

    const region = wrapper.get('[data-test="exercise-region"]')
    expect(region.attributes('data-selected')).toBe('true')
    expect(region.classes()).not.toContain('bg-accent-muted')
    expect(wrapper.find('[data-test="exercise-region-marker"]').exists()).toBe(true)
  })

  it('renders audio_recognition with a real, playable audio element sourced from audioUrl', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'audio_recognition', prompt: plainTextPrompt('p'), options: textOptions, audioUrl: 'https://x/clip.mp3' },
    })

    const audio = wrapper.get('[data-test="exercise-audio-play"]')
    expect(audio.element.tagName).toBe('AUDIO')
    expect(audio.attributes('src')).toBe('https://x/clip.mp3')
    expect(audio.attributes('controls')).toBeDefined()
    expect(wrapper.findAll('[data-test="exercise-option"]')).toHaveLength(2)
  })

  it('marks an option selected on click without ever exposing is_correct', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[1]?.trigger('click')

    expect(rows[1]?.attributes('data-selected')).toBe('true')
    expect(rows[0]?.attributes('data-selected')).toBe('false')
    expect(wrapper.html()).not.toContain('is_correct')
    expect(wrapper.html()).not.toContain('is-correct')
  })

  it('defaults to single-select: clicking a different option replaces the prior selection', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[0]?.trigger('click')
    await rows[1]?.trigger('click')

    expect(rows[0]?.attributes('data-selected')).toBe('false')
    expect(rows[1]?.attributes('data-selected')).toBe('true')
  })

  it('allows selecting more than one option at once when allowMultiple is true', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions, allowMultiple: true },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[0]?.trigger('click')
    await rows[1]?.trigger('click')

    expect(rows[0]?.attributes('data-selected')).toBe('true')
    expect(rows[1]?.attributes('data-selected')).toBe('true')
  })

  it('deselects an option when it is clicked again, regardless of allowMultiple', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[0]?.trigger('click')
    await rows[0]?.trigger('click')

    expect(rows[0]?.attributes('data-selected')).toBe('false')
  })

  it('renders a checkbox-shaped indicator when allowMultiple is true and a radio-shaped one otherwise', () => {
    const single = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions },
    })
    const multi = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions, allowMultiple: true },
    })

    expect(single.get('[data-test="exercise-option-indicator"]').classes()).toContain('rounded-full')
    expect(multi.get('[data-test="exercise-option-indicator"]').classes()).not.toContain('rounded-full')
  })

  it('lays out the prompt beside the content in landscape direction', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions, direction: 'row' },
    })

    expect(wrapper.classes()).toContain('flex-row')
  })

  it('lays out the prompt above the content in portrait (default) direction', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions },
    })

    expect(wrapper.classes()).toContain('flex-col')
  })

  it('emits update:selectedOptionIds with the full selected set on each click', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions, allowMultiple: true },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[1]?.trigger('click')
    await rows[0]?.trigger('click')

    expect(wrapper.emitted('update:selectedOptionIds')).toEqual([[['o2']], [['o2', 'o1']]])
  })

  it('renders caller-supplied selectedOptionIds as already selected', () => {
    const wrapper = mount(ExerciseView, {
      props: {
        exerciseType: 'text_response',
        prompt: plainTextPrompt('p'),
        options: textOptions,
        allowMultiple: true,
        selectedOptionIds: ['o1', 'o2'],
      },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    expect(rows[0]?.attributes('data-selected')).toBe('true')
    expect(rows[1]?.attributes('data-selected')).toBe('true')
  })

  describe('diagram exercises', () => {
    // The diagram loads itself; these tests only check what ExerciseView hands it and does with its picks.
    const EmbeddedDiagramStub = {
      name: 'EmbeddedDiagram',
      props: {
        embed: Object,
        selectablePositionIds: Array,
        selectedPositionIds: Array,
        multiple: Boolean,
        inert: Boolean,
        // Stands in for the real component's own status: whether it would fall back to its slot.
        unavailable: Boolean,
      },
      emits: ['select'],
      template: '<div data-test="embedded-diagram-stub"><slot v-if="unavailable" name="unavailable" /></div>',
    }
    const stubs = { EmbeddedDiagram: EmbeddedDiagramStub }

    const stimulusRef = makeDiagramRef({ diagram_id: 'd1', correct_intervals: ['R'] })
    const derivedOptions: Option[] = [
      { option_id: 'o-p0', is_correct: true, diagram_id: 'd1', diagram_position_id: 'p0' },
      { option_id: 'o-p1', is_correct: false, diagram_id: 'd1', diagram_position_id: 'p1' },
      { option_id: 'o-p5', is_correct: true, diagram_id: 'd1', diagram_position_id: 'p5' },
    ]

    function mountStimulus(props: Record<string, unknown> = {}) {
      return mount(ExerciseView, {
        props: { exerciseType: 'image_recognition', prompt: plainTextPrompt('p'), options: derivedOptions, diagramRef: stimulusRef, ...props },
        global: { stubs },
      })
    }

    it("draws an image_recognition diagram stimulus with its positions as the choices, instead of an image's regions", () => {
      const wrapper = mountStimulus({ allowMultiple: true })

      const diagram = wrapper.getComponent(EmbeddedDiagramStub)
      expect(diagram.props('embed')).toEqual({ kind: 'single', ref: stimulusRef })
      expect(diagram.props('selectablePositionIds')).toEqual(['p0', 'p1', 'p5'])
      expect(diagram.props('multiple')).toBe(true)
      expect(diagram.props('inert')).toBeFalsy()
      expect(wrapper.find('[data-test="exercise-region"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="no-stimulus-image"]').exists()).toBe(false)
    })

    it('selects the option a picked position stands for', async () => {
      const wrapper = mountStimulus({ allowMultiple: true })
      const diagram = wrapper.getComponent(EmbeddedDiagramStub)

      diagram.vm.$emit('select', 'p5')
      await wrapper.vm.$nextTick()
      diagram.vm.$emit('select', 'p0')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:selectedOptionIds')).toEqual([[['o-p5']], [['o-p5', 'o-p0']]])
    })

    it('shows the selected options as selected positions', () => {
      const wrapper = mountStimulus({ selectedOptionIds: ['o-p1'] })

      expect(wrapper.getComponent(EmbeddedDiagramStub).props('selectedPositionIds')).toEqual(['p1'])
    })

    it("shows the no-stimulus placeholder when the diagram can't be shown", () => {
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'image_recognition', prompt: plainTextPrompt('p'), options: derivedOptions, diagramRef: stimulusRef },
        global: { stubs: { EmbeddedDiagram: { ...EmbeddedDiagramStub, props: { ...EmbeddedDiagramStub.props, unavailable: { type: Boolean, default: true } } } } },
      })

      expect(wrapper.find('[data-test="embedded-diagram-stub"] [data-test="no-stimulus-image"]').exists()).toBe(true)
    })

    it('shows an inert diagram thumbnail for an image_choice option that has one, and the card still selects', async () => {
      const thumbRef = makeDiagramRef({ diagram_id: 'd-e-major' })
      const options: Option[] = [
        { option_id: 'c1', is_correct: true, diagram_ref: thumbRef },
        { option_id: 'c2', label: 'Open C chord', image_url: 'https://x/c.png', is_correct: false },
      ]
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'image_choice', prompt: plainTextPrompt('p'), options },
        global: { stubs },
      })

      const cards = wrapper.findAll('[data-test="exercise-option"]')
      const thumb = cards[0]!.getComponent(EmbeddedDiagramStub)
      expect(thumb.props('embed')).toEqual({ kind: 'single', ref: thumbRef })
      expect(thumb.props('inert')).toBe(true)
      expect(cards[0]!.find('img').exists()).toBe(false)
      expect(cards[1]!.find('img').attributes('src')).toBe('https://x/c.png')

      await cards[0]!.trigger('click')
      expect(wrapper.emitted('update:selectedOptionIds')).toEqual([[['c1']]])
    })

    describe('image_choice with diagram thumbnails', () => {
      const diagramChoices: Option[] = [
        { option_id: 'c1', is_correct: true, diagram_ref: makeDiagramRef({ diagram_id: 'd-e-major' }) },
        { option_id: 'c2', is_correct: false, diagram_ref: makeDiagramRef({ diagram_id: 'd-c-major' }) },
      ]

      function mountChoices(options: Option[]) {
        return mount(ExerciseView, {
          props: { exerciseType: 'image_choice', prompt: plainTextPrompt('p'), options },
          global: { stubs },
        })
      }

      it('gives each option a full row on a phone, where a fretboard is too narrow at half width, and two per row from sm up', () => {
        const grid = mountChoices(diagramChoices).get('[data-test="exercise-choice-grid"]')

        expect(grid.classes()).toContain('grid-cols-1')
        expect(grid.classes()).toContain('sm:grid-cols-2')
        expect(grid.classes()).not.toContain('grid-cols-2')
      })

      it('keeps two image options per row', () => {
        const grid = mountChoices(imageOptions).get('[data-test="exercise-choice-grid"]')

        expect(grid.classes()).toContain('grid-cols-2')
      })

      it("lets a diagram thumbnail take its natural height instead of an image's fixed one", () => {
        const media = mountChoices(diagramChoices).get('[data-test="exercise-option-media"]')

        expect(media.classes()).not.toContain('h-32')
      })

      it('shows no empty label strip under an option without a label', () => {
        const cards = mountChoices(diagramChoices).findAll('[data-test="exercise-option"]')

        expect(cards[0]!.find('[data-test="exercise-option-label"]').exists()).toBe(false)
      })
    })
  })
})
