import { afterEach, describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { useCourseForm } from '@/features/teacher/composables/useCourseForm'
import { i18n } from '@/i18n'

type Course = components['schemas']['Course']

const course: Course = {
  course_id: 'c-1',
  title: 'Fingerstyle Foundations',
  summary: 'Fingerpicking from the first pattern.',
  level: 'beginner',
  language: 'pt_BR',
  status: 'draft',
  created_by: { user_id: 't-1', display_name: 'Tomás' },
  created_at: '2026-09-01T00:00:00Z',
  has_unpublished_changes: false,
  instrument_ids: ['i-guitar'],
  thumbnail_url: 'https://cdn.test/thumbnails/c.png',
  checkpoints: [
    { position: 1, learning_path_id: 'lp-1', effective_title: 'Open chords' },
    { position: 2, learning_path_id: 'lp-2', title: 'Stage 2: Travis picking', effective_title: 'Stage 2: Travis picking' },
  ],
}

function filledForm() {
  const form = useCourseForm()
  form.title.value = 'Fingerstyle Foundations'
  form.summary.value = 'Fingerpicking from the first pattern.'
  form.level.value = 'beginner'
  form.addCheckpoint({ learning_path_id: 'lp-1', title: 'Open chords' })
  return form
}

describe('useCourseForm', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('starts empty, at every instrument, in the author\'s UI language', () => {
    i18n.global.locale.value = 'pt-BR'
    const form = useCourseForm()

    expect(form.title.value).toBe('')
    expect(form.summary.value).toBe('')
    expect(form.level.value).toBeNull()
    expect(form.language.value).toBe('pt_BR')
    expect(form.instrumentIds.value).toEqual([])
    expect(form.thumbnailUrl.value).toBeUndefined()
    expect(form.checkpoints.value).toEqual([])
  })

  describe('isValid', () => {
    it('holds once title, summary, level and a checkpoint are set', () => {
      expect(filledForm().isValid.value).toBe(true)
    })

    it.each([
      ['a blank title', (form: ReturnType<typeof useCourseForm>) => (form.title.value = '   ')],
      ['a blank summary', (form: ReturnType<typeof useCourseForm>) => (form.summary.value = ' ')],
      ['no level', (form: ReturnType<typeof useCourseForm>) => (form.level.value = null)],
      ['no checkpoint', (form: ReturnType<typeof useCourseForm>) => form.removeCheckpoint(0)],
    ])('fails with %s', (_, change) => {
      const form = filledForm()
      change(form)

      expect(form.isValid.value).toBe(false)
    })
  })

  describe('toRequest', () => {
    it('maps the form, trimming text and sending checkpoints in order', () => {
      const form = filledForm()
      form.title.value = '  Fingerstyle Foundations '
      form.language.value = 'pt_BR'
      form.instrumentIds.value = ['i-guitar']
      form.thumbnailUrl.value = 'https://cdn.test/thumbnails/c.png'
      form.addCheckpoint({ learning_path_id: 'lp-2', title: 'Travis picking' })
      form.checkpoints.value[1]!.override = ' Stage 2 '

      expect(form.toRequest()).toEqual({
        title: 'Fingerstyle Foundations',
        summary: 'Fingerpicking from the first pattern.',
        level: 'beginner',
        language: 'pt_BR',
        instrument_ids: ['i-guitar'],
        thumbnail_url: 'https://cdn.test/thumbnails/c.png',
        checkpoints: [{ learning_path_id: 'lp-1' }, { learning_path_id: 'lp-2', title: 'Stage 2' }],
      })
    })

    it('sends no title for a blank override, and no thumbnail when there is none', () => {
      const form = filledForm()
      form.checkpoints.value[0]!.override = '   '

      const request = form.toRequest()

      expect(request.checkpoints).toEqual([{ learning_path_id: 'lp-1' }])
      expect(request.checkpoints[0]).not.toHaveProperty('title')
      expect(request).not.toHaveProperty('thumbnail_url')
    })
  })

  describe('checkpoints', () => {
    it('adds a path as the last checkpoint, even one already in the course', () => {
      const form = filledForm()

      form.addCheckpoint({ learning_path_id: 'lp-1', title: 'Open chords' })

      expect(form.checkpoints.value.map((c) => c.learningPathId)).toEqual(['lp-1', 'lp-1'])
      expect(new Set(form.checkpoints.value.map((c) => c.key)).size).toBe(2)
    })

    it('moves a checkpoint', () => {
      const form = filledForm()
      form.addCheckpoint({ learning_path_id: 'lp-2', title: 'Travis picking' })
      form.addCheckpoint({ learning_path_id: 'lp-3', title: 'Arrangements' })

      form.moveCheckpoint(2, 0)

      expect(form.checkpoints.value.map((c) => c.learningPathId)).toEqual(['lp-3', 'lp-1', 'lp-2'])
    })

    it('ignores a move out of range', () => {
      const form = filledForm()

      form.moveCheckpoint(0, 1)
      form.moveCheckpoint(-1, 0)

      expect(form.checkpoints.value.map((c) => c.learningPathId)).toEqual(['lp-1'])
    })

    it('removes a checkpoint', () => {
      const form = filledForm()
      form.addCheckpoint({ learning_path_id: 'lp-2', title: 'Travis picking' })

      form.removeCheckpoint(0)

      expect(form.checkpoints.value.map((c) => c.learningPathId)).toEqual(['lp-2'])
    })
  })

  describe('loadFromCourse', () => {
    it('fills the form from a course', () => {
      const form = useCourseForm()

      form.loadFromCourse(course)

      expect(form.title.value).toBe('Fingerstyle Foundations')
      expect(form.summary.value).toBe('Fingerpicking from the first pattern.')
      expect(form.level.value).toBe('beginner')
      expect(form.language.value).toBe('pt_BR')
      expect(form.instrumentIds.value).toEqual(['i-guitar'])
      expect(form.thumbnailUrl.value).toBe('https://cdn.test/thumbnails/c.png')
      expect(form.checkpoints.value.map((c) => [c.learningPathId, c.override])).toEqual([
        ['lp-1', ''],
        ['lp-2', 'Stage 2: Travis picking'],
      ])
    })

    it("knows a checkpoint's path title only when it has no override", () => {
      const form = useCourseForm()

      form.loadFromCourse(course)

      expect(form.checkpoints.value.map((c) => c.pathTitle)).toEqual(['Open chords', null])
      expect(form.checkpointsMissingPathTitle.value).toEqual(['lp-2'])
    })

    it("fills in a path title once it's known", () => {
      const form = useCourseForm()
      form.loadFromCourse(course)

      form.setPathTitle('lp-2', 'Travis picking')

      expect(form.checkpoints.value[1]!.pathTitle).toBe('Travis picking')
      expect(form.checkpointsMissingPathTitle.value).toEqual([])
    })
  })

  describe('isDirty', () => {
    it('is clean when new, and dirty once anything is entered', () => {
      const form = useCourseForm()
      expect(form.isDirty.value).toBe(false)

      form.summary.value = 'x'
      expect(form.isDirty.value).toBe(true)
    })

    it('is clean right after loading, and after a change is undone', () => {
      const form = useCourseForm()
      form.loadFromCourse(course)
      expect(form.isDirty.value).toBe(false)

      form.checkpoints.value[0]!.override = 'Stage 1'
      expect(form.isDirty.value).toBe(true)

      form.checkpoints.value[0]!.override = ''
      expect(form.isDirty.value).toBe(false)
    })

    it('is dirty after reordering checkpoints', () => {
      const form = useCourseForm()
      form.loadFromCourse(course)

      form.moveCheckpoint(0, 1)

      expect(form.isDirty.value).toBe(true)
    })
  })
})
