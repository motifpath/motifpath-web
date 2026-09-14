import { describe, expect, it } from 'vitest'

import { useExerciseForm } from '@/features/teacher/composables/useExerciseForm'

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
      form.editImageOptionCaption(id, 'Open position')
      form.toggleImageOption(id)

      expect(form.imageOptions.value[0]).toMatchObject({
        imageUrl: 'https://cdn.example.com/a.png',
        caption: 'Open position',
        correct: true,
      })
      expect(form.hasCorrectOption.value).toBe(true)

      form.removeImageOption(id)
      expect(form.imageOptions.value).toHaveLength(0)
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
      form.prompt.value = 'Name this chord shape'
      form.exerciseType.value = 'text_response'
      form.addTextOption()
      form.editTextOption(form.textOptions.value[0]!.id, 'G major')
      form.toggleTextOption(form.textOptions.value[0]!.id)
      form.addTag('theory')

      const request = form.toCreateExerciseRequest()

      expect(request).toEqual({
        title: 'Name the chord',
        prompt: 'Name this chord shape',
        exercise_type: 'text_response',
        skill_tags: ['theory'],
        options: [{ option_id: form.textOptions.value[0]!.id, is_correct: true, label: 'G major' }],
      })
    })

    it('maps an image_recognition exercise with image_url and regions', () => {
      const form = useExerciseForm()
      form.title.value = 'Root position'
      form.prompt.value = 'Identify the root position'
      form.exerciseType.value = 'image_recognition'
      form.imageUrl.value = 'https://cdn.example.com/fretboard.png'
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
            width: form.regions.value[0]!.width / 100,
            height: form.regions.value[0]!.height / 100,
            shape: 'rectangle',
          },
        },
      ])
    })

    it('maps an image_choice exercise with per-option image_url', () => {
      const form = useExerciseForm()
      form.title.value = 'Pick the diagram'
      form.prompt.value = 'Which is E minor?'
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

    it('omits skill_tags when there are none', () => {
      const form = useExerciseForm()
      form.title.value = 'title'
      form.prompt.value = 'prompt'
      form.exerciseType.value = 'text_response'

      const request = form.toCreateExerciseRequest()

      expect(request.skill_tags).toBeUndefined()
    })

    it('falls back to an empty options array for an unrecognized exercise type, instead of undefined', () => {
      const form = useExerciseForm()
      form.title.value = 'title'
      form.prompt.value = 'prompt'
      // Simulates a stale generated client seeing a type value the backend
      // added but this build doesn't know about yet — never a real value
      // the type picker itself can produce.
      form.exerciseType.value = 'future_type' as never

      const request = form.toCreateExerciseRequest()

      expect(request.options).toEqual([])
    })
  })
})
