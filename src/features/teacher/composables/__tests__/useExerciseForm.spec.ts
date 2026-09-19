import { describe, expect, it } from 'vitest'

import { useExerciseForm } from '@/features/teacher/composables/useExerciseForm'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'

describe('useExerciseForm', () => {
  it('starts with no correct option for any type', () => {
    const form = useExerciseForm()

    expect(form.hasCorrectOption.value).toBe(false)
  })

  it('assigns real UUIDs to new options — the API requires option_id to be a UUID', () => {
    const form = useExerciseForm()
    form.exerciseType.value = 'text_response'

    form.addTextOption()

    expect(form.textOptions.value[0]!.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })

  describe('text_response / audio_recognition options', () => {
    it('adds, edits, toggles, and removes a text option', () => {
      const form = useExerciseForm()
      form.exerciseType.value = 'text_response'

      form.addTextOption()
      expect(form.textOptions.value).toHaveLength(1)

      const id = form.textOptions.value[0]!.id
      form.editTextOption(id, 'G major')
      expect(form.textOptions.value[0]!.label).toBe('G major')

      form.toggleTextOption(id)
      expect(form.textOptions.value[0]!.correct).toBe(true)
      expect(form.hasCorrectOption.value).toBe(true)

      form.removeTextOption(id)
      expect(form.textOptions.value).toHaveLength(0)
    })

    it('shares the same option list for audio_recognition', () => {
      const form = useExerciseForm()
      form.exerciseType.value = 'audio_recognition'

      form.addTextOption()
      form.toggleTextOption(form.textOptions.value[0]!.id)

      expect(form.hasCorrectOption.value).toBe(true)
    })
  })

  describe('image_choice options', () => {
    it('adds, sets image, toggles, and removes an image option', () => {
      const form = useExerciseForm()
      form.exerciseType.value = 'image_choice'

      form.addImageOption()
      const id = form.imageOptions.value[0]!.id
      form.setImageOptionURL(id, 'https://cdn.example.com/a.png')
      form.toggleImageOption(id)

      expect(form.imageOptions.value[0]).toMatchObject({
        imageUrl: 'https://cdn.example.com/a.png',
        correct: true,
      })
      expect(form.hasCorrectOption.value).toBe(true)

      form.removeImageOption(id)
      expect(form.imageOptions.value).toHaveLength(0)
    })
  })

  describe('audio_selection options', () => {
    it('adds, sets audio, sets label, toggles, and removes an audio option', () => {
      const form = useExerciseForm()
      form.exerciseType.value = 'audio_selection'

      form.addAudioOption()
      const id = form.audioOptions.value[0]!.id
      form.setAudioOptionURL(id, 'https://cdn.example.com/a.mp3')
      form.editAudioOptionLabel(id, 'Lick A')
      form.toggleAudioOption(id)

      expect(form.audioOptions.value[0]).toMatchObject({
        audioUrl: 'https://cdn.example.com/a.mp3',
        label: 'Lick A',
        correct: true,
      })
      expect(form.hasCorrectOption.value).toBe(true)

      form.removeAudioOption(id)
      expect(form.audioOptions.value).toHaveLength(0)
    })
  })

  describe('image_recognition regions', () => {
    it('adds a region at a position, moves, resizes, toggles, and removes it', () => {
      const form = useExerciseForm()
      form.exerciseType.value = 'image_recognition'

      form.addRegion(20, 30, 'circle')
      const id = form.regions.value[0]!.id
      expect(form.regions.value[0]).toMatchObject({ x: 20, y: 30, shape: 'circle' })
      const initialWidth = form.regions.value[0]!.width

      form.moveRegion(id, 40, 50)
      expect(form.regions.value[0]).toMatchObject({ x: 40, y: 50 })

      form.resizeRegion(id, 8, 0)
      expect(form.regions.value[0]!.width).toBe(initialWidth + 8)
      // a circle keeps width and height equal regardless of which delta is passed
      expect(form.regions.value[0]!.height).toBe(form.regions.value[0]!.width)

      form.toggleRegion(id)
      expect(form.hasCorrectOption.value).toBe(true)

      form.removeRegion(id)
      expect(form.regions.value).toHaveLength(0)
    })

    it('resizes rectangle width and height independently', () => {
      const form = useExerciseForm()
      form.exerciseType.value = 'image_recognition'
      form.addRegion(50, 50, 'rectangle')
      const id = form.regions.value[0]!.id
      const before = { ...form.regions.value[0]! }

      form.resizeRegion(id, 8, 0)
      expect(form.regions.value[0]!.width).toBe(before.width + 8)
      expect(form.regions.value[0]!.height).toBe(before.height)

      form.resizeRegion(id, 0, 8)
      expect(form.regions.value[0]!.height).toBe(before.height + 8)
    })

    it('clamps region size within sane bounds', () => {
      const form = useExerciseForm()
      form.exerciseType.value = 'image_recognition'
      form.addRegion(50, 50, 'circle')
      const id = form.regions.value[0]!.id

      for (let i = 0; i < 50; i++) form.resizeRegion(id, -8, -8)
      expect(form.regions.value[0]!.width).toBeGreaterThanOrEqual(18)

      for (let i = 0; i < 50; i++) form.resizeRegion(id, 8, 8)
      expect(form.regions.value[0]!.width).toBeLessThanOrEqual(160)
    })
  })

  describe('skill tags', () => {
    it('adds a trimmed, non-empty tag and ignores duplicates', () => {
      const form = useExerciseForm()

      form.addTag('  alternate_picking  ')
      form.addTag('alternate_picking')
      form.addTag('')

      expect(form.skillTags.value).toEqual(['alternate_picking'])
    })

    it('removes a tag', () => {
      const form = useExerciseForm()
      form.addTag('technique')

      form.removeTag('technique')

      expect(form.skillTags.value).toEqual([])
    })
  })

  describe('toCreateExerciseRequest', () => {
    it('maps a text_response exercise', () => {
      const form = useExerciseForm()
      form.title.value = 'Name the chord'
      form.prompt.value = plainTextPrompt('Name this chord shape')
      form.exerciseType.value = 'text_response'
      form.addTextOption()
      form.editTextOption(form.textOptions.value[0]!.id, 'G major')
      form.toggleTextOption(form.textOptions.value[0]!.id)
      form.addTag('theory')

      const request = form.toCreateExerciseRequest()

      expect(request).toEqual({
        title: 'Name the chord',
        prompt: plainTextPrompt('Name this chord shape'),
        exercise_type: 'text_response',
        skill_tags: ['theory'],
        options: [{ option_id: form.textOptions.value[0]!.id, is_correct: true, label: 'G major' }],
        language_codes: ['any'],
      })
    })

    it('maps an image_recognition exercise with image_url and regions, sizing width/height against the measured stimulus image', () => {
      const form = useExerciseForm()
      form.title.value = 'Root position'
      form.prompt.value = plainTextPrompt('Identify the root position')
      form.exerciseType.value = 'image_recognition'
      form.imageUrl.value = 'https://cdn.example.com/fretboard.png'
      form.setStimulusImageSize(800, 240)
      form.addRegion(20, 30, 'rectangle')
      form.toggleRegion(form.regions.value[0]!.id)

      const request = form.toCreateExerciseRequest()

      expect(request.image_url).toBe('https://cdn.example.com/fretboard.png')
      expect(request.options).toEqual([
        {
          option_id: form.regions.value[0]!.id,
          is_correct: true,
          region: {
            x: form.regions.value[0]!.x / 100,
            y: form.regions.value[0]!.y / 100,
            width: form.regions.value[0]!.width / 800,
            height: form.regions.value[0]!.height / 240,
            shape: 'rectangle',
          },
        },
      ])
    })

    it('falls back to a 0 fraction for region width/height when the stimulus image has not been measured yet', () => {
      const form = useExerciseForm()
      form.title.value = 'Root position'
      form.prompt.value = plainTextPrompt('Identify the root position')
      form.exerciseType.value = 'image_recognition'
      form.imageUrl.value = 'https://cdn.example.com/fretboard.png'
      form.addRegion(20, 30, 'rectangle')
      form.toggleRegion(form.regions.value[0]!.id)

      const request = form.toCreateExerciseRequest()

      const region = (request.options[0] as { region: { width: number; height: number } }).region
      expect(region.width).toBe(0)
      expect(region.height).toBe(0)
    })

    it('maps an image_choice exercise with per-option image_url', () => {
      const form = useExerciseForm()
      form.title.value = 'Pick the diagram'
      form.prompt.value = plainTextPrompt('Which is E minor?')
      form.exerciseType.value = 'image_choice'
      form.addImageOption()
      form.setImageOptionURL(form.imageOptions.value[0]!.id, 'https://cdn.example.com/e-minor.png')
      form.toggleImageOption(form.imageOptions.value[0]!.id)

      const request = form.toCreateExerciseRequest()

      expect(request.options).toEqual([
        {
          option_id: form.imageOptions.value[0]!.id,
          is_correct: true,
          image_url: 'https://cdn.example.com/e-minor.png',
        },
      ])
    })

    it('maps an audio_selection exercise with per-option audio_url and label', () => {
      const form = useExerciseForm()
      form.title.value = 'Pick the lick'
      form.prompt.value = plainTextPrompt('Which is a minor pentatonic lick?')
      form.exerciseType.value = 'audio_selection'
      form.addAudioOption()
      form.setAudioOptionURL(form.audioOptions.value[0]!.id, 'https://cdn.example.com/lick.mp3')
      form.editAudioOptionLabel(form.audioOptions.value[0]!.id, 'Lick A')
      form.toggleAudioOption(form.audioOptions.value[0]!.id)

      const request = form.toCreateExerciseRequest()

      expect(request.options).toEqual([
        {
          option_id: form.audioOptions.value[0]!.id,
          is_correct: true,
          audio_url: 'https://cdn.example.com/lick.mp3',
          label: 'Lick A',
        },
      ])
    })

    it('omits skill_tags when there are none', () => {
      const form = useExerciseForm()
      form.title.value = 'title'
      form.prompt.value = plainTextPrompt('prompt')
      form.exerciseType.value = 'text_response'

      const request = form.toCreateExerciseRequest()

      expect(request.skill_tags).toBeUndefined()
    })

    it('falls back to an empty options array for an unrecognized exercise type, instead of undefined', () => {
      const form = useExerciseForm()
      form.title.value = 'title'
      form.prompt.value = plainTextPrompt('prompt')
      // Simulates a stale generated client seeing a type value the backend
      // added but this build doesn't know about yet — never a real value
      // the type picker itself can produce.
      form.exerciseType.value = 'future_type' as never

      const request = form.toCreateExerciseRequest()

      expect(request.options).toEqual([])
    })
  })

  describe('loadFromExercise', () => {
    it('hydrates title, prompt, type, skill tags, and text_response options', () => {
      const form = useExerciseForm()

      form.loadFromExercise({
        exercise_id: 'e-1',
        title: 'Name the chord',
        prompt: plainTextPrompt('Name this chord shape'),
        exercise_type: 'text_response',
        skill_tags: ['theory'],
        options: [{ option_id: 'o-1', is_correct: true, label: 'G major' }],
        challenge_ids: [],
        content_node_ids: [],
        created_at: '2026-01-01T00:00:00Z',
        languages: [],
        remediation_targets: [],
      })

      expect(form.title.value).toBe('Name the chord')
      expect(form.prompt.value).toEqual(plainTextPrompt('Name this chord shape'))
      expect(form.exerciseType.value).toBe('text_response')
      expect(form.skillTags.value).toEqual(['theory'])
      expect(form.textOptions.value).toEqual([{ id: 'o-1', label: 'G major', correct: true }])
    })

    it('hydrates image_choice options', () => {
      const form = useExerciseForm()

      form.loadFromExercise({
        exercise_id: 'e-1',
        title: 't',
        prompt: plainTextPrompt('p'),
        exercise_type: 'image_choice',
        options: [{ option_id: 'o-1', is_correct: false, image_url: 'https://cdn.example.com/e-minor.png' }],
        challenge_ids: [],
        content_node_ids: [],
        created_at: '2026-01-01T00:00:00Z',
        languages: [],
        remediation_targets: [],
      })

      expect(form.imageOptions.value).toEqual([
        { id: 'o-1', imageUrl: 'https://cdn.example.com/e-minor.png', correct: false },
      ])
    })

    it('hydrates audio_selection options, including label', () => {
      const form = useExerciseForm()

      form.loadFromExercise({
        exercise_id: 'e-1',
        title: 't',
        prompt: plainTextPrompt('p'),
        exercise_type: 'audio_selection',
        options: [
          { option_id: 'o-1', is_correct: false, audio_url: 'https://cdn.example.com/lick.mp3', label: 'Lick A' },
        ],
        challenge_ids: [],
        content_node_ids: [],
        created_at: '2026-01-01T00:00:00Z',
        languages: [],
        remediation_targets: [],
      })

      expect(form.audioOptions.value).toEqual([
        { id: 'o-1', audioUrl: 'https://cdn.example.com/lick.mp3', label: 'Lick A', correct: false },
      ])
    })

    it('defers image_recognition regions until the stimulus image is measured, then converts fractions to pixels', () => {
      const form = useExerciseForm()

      form.loadFromExercise({
        exercise_id: 'e-1',
        title: 't',
        prompt: plainTextPrompt('p'),
        exercise_type: 'image_recognition',
        image_url: 'https://cdn.example.com/fretboard.png',
        options: [
          {
            option_id: 'o-1',
            is_correct: true,
            region: { x: 0.25, y: 0.5, width: 0.1, height: 0.2, shape: 'rectangle' },
          },
        ],
        challenge_ids: [],
        content_node_ids: [],
        created_at: '2026-01-01T00:00:00Z',
        languages: [],
        remediation_targets: [],
      })

      expect(form.imageUrl.value).toBe('https://cdn.example.com/fretboard.png')
      expect(form.regions.value).toEqual([])

      form.setStimulusImageSize(800, 240)

      expect(form.regions.value).toEqual([
        { id: 'o-1', x: 25, y: 50, width: 80, height: 48, shape: 'rectangle', correct: true },
      ])
    })
  })

  describe('toUpdateExerciseRequest', () => {
    it('maps form state to an UpdateExerciseRequest, without exercise_type', () => {
      const form = useExerciseForm()
      form.title.value = 'Name the chord'
      form.prompt.value = plainTextPrompt('Name this chord shape')
      form.exerciseType.value = 'text_response'
      form.addTextOption()
      form.editTextOption(form.textOptions.value[0]!.id, 'G major')
      form.toggleTextOption(form.textOptions.value[0]!.id)
      form.addTag('theory')

      const request = form.toUpdateExerciseRequest()

      expect(request).toEqual({
        title: 'Name the chord',
        prompt: plainTextPrompt('Name this chord shape'),
        skill_tags: ['theory'],
        options: [{ option_id: form.textOptions.value[0]!.id, is_correct: true, label: 'G major' }],
        language_codes: ['any'],
      })
      expect(request).not.toHaveProperty('exercise_type')
    })
  })
})
