import { describe, expect, it } from 'vitest'

import {
  coursesQuery,
  diagramsQuery,
  exercisesQuery,
  lessonsQuery,
  pathsQuery,
} from '@/features/teacher/utils/authoringApiQuery'
import { emptyListState, parseListQuery } from '@/features/teacher/utils/authoringListQuery'

const SKILL_A = '3f4b6f2a-8c3e-4b1a-9d2e-7a1c5f0e9b21'
const SKILL_B = '7a2d9e10-4f3b-4c5a-8e6d-1b2c3d4e5f60'
const INSTRUMENT = '5e4d3c2b-1a09-4f8e-8d7c-6b5a4f3e2d1c'
const AUTHOR = '0b6f5d7e-1c2a-4e3b-9f8d-6a5b4c3d2e1f'

describe('the API query of each list', () => {
  it('asks for nothing but the defaults when nothing is chosen', () => {
    const state = emptyListState()
    expect(diagramsQuery(state)).toEqual({})
    expect(exercisesQuery(state)).toEqual({})
    expect(lessonsQuery(state)).toEqual({})
    expect(pathsQuery(state)).toEqual({})
    expect(coursesQuery(state)).toEqual({})
  })

  it('asks for diagrams by name, kind, what they show, root, skills and author', () => {
    const state = parseListQuery('diagrams', {
      q: 'pentatonic',
      sort: 'updated',
      instrument: INSTRUMENT,
      kind: 'templates',
      shows: 'both',
      root: 'A',
      language: 'en',
      skill: [SKILL_A, SKILL_B],
      concept: SKILL_A,
      author: AUTHOR,
    })

    expect(diagramsQuery(state)).toEqual({
      name: 'pentatonic',
      sort: 'updated',
      instrument_id: INSTRUMENT,
      kind: 'basic',
      purpose: 'any',
      root_note: 'A',
      language: 'en',
      skill_ids: [SKILL_A, SKILL_B],
      concept_ids: [SKILL_A],
      created_by: AUTHOR,
    })
  })

  it('asks for custom diagrams and for chord voicings only', () => {
    const state = parseListQuery('diagrams', { kind: 'custom', shows: 'chord_voicings' })
    expect(diagramsQuery(state)).toEqual({ kind: 'custom', purpose: 'chord_voicing' })
  })

  it('asks for exercises by text and type', () => {
    const state = parseListQuery('exercises', { q: 'interval', type: 'audio_recognition', author: AUTHOR })
    expect(exercisesQuery(state)).toEqual({ q: 'interval', exercise_type: 'audio_recognition', created_by: AUTHOR })
  })

  it('asks for exercises for the instrument as a list of one, as that list takes several', () => {
    const state = parseListQuery('exercises', { instrument: INSTRUMENT })
    expect(exercisesQuery(state)).toEqual({ instrument_id: [INSTRUMENT] })
  })

  it('asks for lessons by type, level, status and language', () => {
    const state = parseListQuery('lessons', {
      type: 'video',
      level: 'beginner',
      status: 'unpublished_changes',
      language: 'pt_BR',
    })
    expect(lessonsQuery(state)).toEqual({
      content_type: 'video',
      difficulty_level: 'beginner',
      status: 'unpublished_changes',
      language: 'pt_BR',
    })
  })

  it('asks for paths and courses by level and status', () => {
    expect(pathsQuery(parseListQuery('paths', { level: 'advanced', status: 'draft' }))).toEqual({
      levels: ['advanced'],
      status: 'draft',
    })
    expect(coursesQuery(parseListQuery('courses', { level: 'expert', status: 'retired', sort: 'updated' }))).toEqual({
      levels: ['expert'],
      status: 'retired',
      sort: 'updated',
    })
  })
})
