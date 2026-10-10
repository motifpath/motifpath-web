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
    // jsdom has no real media pipeline, so play and pause are stubbed for every test here.
    beforeEach(() => {
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    function mountSounds(props: Partial<InstanceType<typeof ExerciseView>['$props']> = {}) {
      return mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: plainTextPrompt('p'), options: audioOptions, ...props },
      })
    }
    const rows = (wrapper: ReturnType<typeof mountSounds>) => wrapper.findAll('[data-test="exercise-option"]')
    const playButton = (wrapper: ReturnType<typeof mountSounds>, i: number) => rows(wrapper)[i]!.get('[data-test="option-play"]')
    const player = (wrapper: ReturnType<typeof mountSounds>) => wrapper.get('audio').element as HTMLAudioElement

    it('lists each sound as a labelled row with its own play button, and no visible native player', () => {
      const wrapper = mountSounds()

      expect(rows(wrapper).map((row) => row.text())).toEqual([expect.stringContaining('Lick A'), expect.stringContaining('Lick B')])
      expect(playButton(wrapper, 0).attributes('aria-label')).toBe('Play Lick A')
      expect(wrapper.findAll('audio')).toHaveLength(1)
      expect(wrapper.get('audio').attributes('controls')).toBeUndefined()
    })

    it('selects an option when its row is tapped, without playing it', async () => {
      const wrapper = mountSounds()

      await rows(wrapper)[1]!.trigger('click')

      expect(rows(wrapper)[1]!.attributes('data-selected')).toBe('true')
      expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
    })

    it('plays an option’s clip from its play button, without selecting it', async () => {
      const wrapper = mountSounds()

      await playButton(wrapper, 0).trigger('click')

      expect(player(wrapper).src).toBe('https://x/lick1.mp3')
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
      expect(rows(wrapper).every((row) => row.attributes('data-selected') === 'false')).toBe(true)
      expect(wrapper.emitted('playing')).toEqual([[true]])
    })

    it('switches clips without overlapping them', async () => {
      const wrapper = mountSounds()

      await playButton(wrapper, 0).trigger('click')
      await playButton(wrapper, 1).trigger('click')

      expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
      expect(player(wrapper).src).toBe('https://x/lick2.mp3')
      expect(playButton(wrapper, 1).attributes('aria-label')).toBe('Stop Lick B')
    })

    it('stops a clip when its play button is tapped again', async () => {
      const wrapper = mountSounds()

      await playButton(wrapper, 0).trigger('click')
      await playButton(wrapper, 0).trigger('click')

      expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('playing')).toEqual([[true], [false]])
      expect(playButton(wrapper, 0).attributes('aria-label')).toBe('Play Lick A')
    })

    it('says when a clip ends by itself, and plays it again from the start', async () => {
      const wrapper = mountSounds()

      await playButton(wrapper, 0).trigger('click')
      await wrapper.get('audio').trigger('ended')
      await playButton(wrapper, 0).trigger('click')

      expect(wrapper.emitted('playing')).toEqual([[true], [false], [true]])
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
    })

    it('stops the clip sounding once the answer is graded', async () => {
      const wrapper = mountSounds()
      await playButton(wrapper, 0).trigger('click')

      await wrapper.setProps({ selectedOptionIds: ['a1'], reveal: { correctOptionIds: ['a1'] } })

      expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
      expect(wrapper.emitted('playing')).toEqual([[true], [false]])
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

  it('says how many to choose after the prompt, when told', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions, allowMultiple: true, chooseCount: 2 },
    })

    expect(wrapper.get('[data-test="choose-count"]').text()).toBe('Choose 2')
  })

  it('says nothing about how many when not told', () => {
    const wrapper = mount(ExerciseView, { props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions } })

    expect(wrapper.find('[data-test="choose-count"]').exists()).toBe(false)
  })

  it('shows each text option with the number key that chooses it', () => {
    const wrapper = mount(ExerciseView, { props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions } })

    expect(wrapper.findAll('[data-test="exercise-option"] [data-test="key-hint"]').map((hint) => hint.text())).toEqual(['1', '2'])
  })

  it('locks the options it doesn’t mark once the answer is graded', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: [...textOptions, { option_id: 'o3', label: 'Tapping', is_correct: false }], selectedOptionIds: ['o2'], reveal: { correctOptionIds: ['o1'] } },
    })

    expect(wrapper.findAll('[data-test="exercise-option"]').map((option) => option.attributes('data-state'))).toEqual(['right', 'wrong', 'locked'])
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

  describe('a graded answer', () => {
    function marks(wrapper: ReturnType<typeof mount>, selector = '[data-test="exercise-option"]') {
      return wrapper.findAll(selector).map((el) => el.attributes('data-mark') ?? null)
    }

    it('stays neutral until the caller grades it, whatever is selected', () => {
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions, selectedOptionIds: ['o2'] },
      })

      expect(wrapper.find('[data-mark]').exists()).toBe(false)
    })

    it.each([
      ['text_response', textOptions],
      ['audio_recognition', textOptions],
      ['image_choice', imageOptions],
      ['audio_selection', audioOptions],
    ] as const)('reveals the right option and marks a wrong pick for %s', (exerciseType, options) => {
      const [right, wrong] = options
      const wrapper = mount(ExerciseView, {
        props: {
          exerciseType,
          prompt: plainTextPrompt('p'),
          options: [...options],
          selectedOptionIds: [wrong!.option_id],
          reveal: { correctOptionIds: [right!.option_id] },
        },
      })

      expect(marks(wrapper)).toEqual(['right', 'wrong'])
      const [rightRow, wrongRow] = wrapper.findAll('[data-test="exercise-option"]')
      expect(rightRow!.get('[data-test="answer-mark"]').text()).toBe('Right answer')
      expect(wrongRow!.get('[data-test="answer-mark"]').text()).toBe('Your answer, wrong')
    })

    it('marks a right pick right, and leaves an option neither right nor picked unmarked', () => {
      const options: Option[] = [...textOptions, { option_id: 'o3', label: 'Sweep', is_correct: false }]
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options, selectedOptionIds: ['o1'], reveal: { correctOptionIds: ['o1'] } },
      })

      expect(marks(wrapper)).toEqual(['right', null, null])
    })

    it('marks the regions of an image', () => {
      const options: Option[] = [
        ...regionOptions,
        { option_id: 'r2', is_correct: false, region: { x: 0.6, y: 0.3, width: 0.1, height: 0.1, shape: 'circle' } },
      ]
      const wrapper = mount(ExerciseView, {
        props: {
          exerciseType: 'image_recognition',
          prompt: plainTextPrompt('p'),
          options,
          imageUrl: 'https://x/neck.png',
          selectedOptionIds: ['r2'],
          reveal: { correctOptionIds: ['r1'] },
        },
      })

      expect(marks(wrapper, '[data-test="exercise-region"]')).toEqual(['right', 'wrong'])
      expect(wrapper.findAll('[data-test="exercise-region"] [data-test="answer-mark"]').map((m) => m.text())).toEqual([
        'Right answer',
        'Your answer, wrong',
      ])
    })

    it('takes no more choices once graded', async () => {
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'text_response', prompt: plainTextPrompt('p'), options: textOptions, selectedOptionIds: ['o2'], reveal: { correctOptionIds: ['o1'] } },
      })

      await wrapper.findAll('[data-test="exercise-option"]')[0]!.trigger('click')

      expect(wrapper.emitted('update:selectedOptionIds')).toBeUndefined()
    })
  })

  describe('diagram exercises', () => {
    // The diagram loads itself; these tests only check what ExerciseView hands it and does with its picks.
    const EmbeddedDiagramStub = {
      name: 'EmbeddedDiagram',
      props: {
        embed: Object,
        selectablePositionIds: Array,
        selectedPositionIds: Array,
        answerCells: Array,
        selectedAnswerIds: Array,
        multiple: Boolean,
        inert: Boolean,
        compact: Boolean,
        // Stands in for the real component's own status: whether it would fall back to its slot.
        unavailable: Boolean,
        answerMarks: Object,
        positionMarks: Object,
      },
      emits: ['select', 'selectAnswer'],
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

    describe('answer cells', () => {
      const cellOptions: Option[] = [
        { option_id: 'o-6-5', is_correct: true, diagram_id: 'd1', diagram_position_id: 'p0', fret_cell: { string: 6, fret: 5 } },
        { option_id: 'o-1-5', is_correct: false, diagram_id: 'd1', fret_cell: { string: 1, fret: 5 } },
      ]

      it('offers every cell as a choice, not the drawn positions', () => {
        const diagram = mountStimulus({ options: cellOptions }).getComponent(EmbeddedDiagramStub)

        expect(diagram.props('answerCells')).toEqual([
          { optionId: 'o-6-5', string: 6, fret: 5 },
          { optionId: 'o-1-5', string: 1, fret: 5 },
        ])
        expect(diagram.props('selectablePositionIds')).toEqual([])
      })

      it('selects the option a picked cell stands for, and shows it picked', async () => {
        const wrapper = mountStimulus({ options: cellOptions })
        wrapper.getComponent(EmbeddedDiagramStub).vm.$emit('selectAnswer', 'o-1-5')
        await wrapper.vm.$nextTick()

        expect(wrapper.emitted('update:selectedOptionIds')).toEqual([[['o-1-5']]])
        expect(wrapper.getComponent(EmbeddedDiagramStub).props('selectedAnswerIds')).toEqual(['o-1-5'])
      })
    })

    it('marks a graded answer on the diagram’s positions', () => {
      const diagram = mountStimulus({ selectedOptionIds: ['o-p1'], reveal: { correctOptionIds: ['o-p0', 'o-p5'] } }).getComponent(EmbeddedDiagramStub)

      expect(diagram.props('positionMarks')).toEqual({ p0: 'right', p5: 'right', p1: 'wrong' })
    })

    it('marks a graded answer on the fretboard cells', () => {
      const options: Option[] = [
        { option_id: 'o-6-5', is_correct: true, fret_cell: { string: 6, fret: 5 } },
        { option_id: 'o-1-5', is_correct: false, fret_cell: { string: 1, fret: 5 } },
      ]
      const diagram = mountStimulus({ options, selectedOptionIds: ['o-1-5'], reveal: { correctOptionIds: ['o-6-5'] } }).getComponent(
        EmbeddedDiagramStub,
      )

      expect(diagram.props('answerMarks')).toEqual({ 'o-6-5': 'right', 'o-1-5': 'wrong' })
    })

    it('marks nothing on a diagram before an answer is graded', () => {
      const diagram = mountStimulus({ selectedOptionIds: ['o-p1'] }).getComponent(EmbeddedDiagramStub)

      expect(diagram.props('positionMarks')).toEqual({})
      expect(diagram.props('answerMarks')).toEqual({})
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
      expect(thumb.props('compact')).toBe(true)
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

  describe('a missing stimulus', () => {
    const listening = { exerciseType: 'audio_recognition' as const, prompt: plainTextPrompt('p'), options: textOptions, audioUrl: 'https://x/third.mp3' }

    it('says when the sound to hear didn’t load', async () => {
      const wrapper = mount(ExerciseView, { props: listening })

      await wrapper.get('[data-test="exercise-audio-play"]').trigger('error')

      expect(wrapper.emitted('stimulusMissing')).toEqual([['failed_to_load']])
    })

    it('says when the picture to look at didn’t load', async () => {
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'image_recognition', prompt: plainTextPrompt('p'), options: regionOptions, imageUrl: 'https://x/fretboard.png' },
      })

      await wrapper.get('[data-test="exercise-stimulus-image"]').trigger('error')

      expect(wrapper.emitted('stimulusMissing')).toEqual([['failed_to_load']])
    })

    it('says when the diagram to look at can’t be shown here', () => {
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'image_recognition', prompt: plainTextPrompt('p'), options: regionOptions, diagramRef: makeDiagramRef({ diagram_id: 'd1' }) },
        global: { stubs: { EmbeddedDiagram: { name: 'EmbeddedDiagram', emits: ['status'], template: '<div />' } } },
      })

      wrapper.getComponent({ name: 'EmbeddedDiagram' }).vm.$emit('status', 'unavailable')

      expect(wrapper.emitted('stimulusMissing')).toEqual([['unavailable']])
    })

    it('shows the caller’s notice in place of the missing stimulus, and locks the options', async () => {
      const wrapper = mount(ExerciseView, {
        props: { ...listening, stimulusMissing: true },
        slots: { 'stimulus-notice': '<p data-test="notice">The sound didn’t load.</p>' },
      })

      expect(wrapper.find('[data-test="exercise-audio-play"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="notice"]').exists()).toBe(true)
      const option = wrapper.findAll('[data-test="exercise-option"]')[0]!
      expect(option.attributes('data-locked')).toBe('true')
      await option.trigger('click')
      expect(wrapper.emitted('update:selectedOptionIds')).toBeUndefined()
    })

    it('loads the stimulus again once it is no longer missing', async () => {
      const wrapper = mount(ExerciseView, { props: { ...listening, stimulusMissing: true } })

      await wrapper.setProps({ stimulusMissing: false })

      expect(wrapper.find('[data-test="exercise-audio-play"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-test="exercise-option"]')[0]!.attributes('data-locked')).toBe('false')
    })
  })
})
