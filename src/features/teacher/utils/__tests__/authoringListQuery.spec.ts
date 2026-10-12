import { describe, expect, it } from 'vitest'

import {
  activeFilterCount,
  emptyListState,
  hasListQuery,
  parseListQuery,
  sectionFilters,
  sectionStatuses,
  toListQuery,
} from '@/features/teacher/utils/authoringListQuery'

const SKILL_A = '3f4b6f2a-8c3e-4b1a-9d2e-7a1c5f0e9b21'
const SKILL_B = '7a2d9e10-4f3b-4c5a-8e6d-1b2c3d4e5f60'
const AUTHOR = '0b6f5d7e-1c2a-4e3b-9f8d-6a5b4c3d2e1f'

describe('sectionFilters', () => {
  it('offers each section exactly the filters its list takes, in screen order', () => {
    expect(sectionFilters('diagrams')).toEqual([
      'instrument', 'kind', 'shows', 'root', 'language', 'skills', 'concepts', 'author',
    ])
    expect(sectionFilters('exercises')).toEqual(['type', 'instrument', 'language', 'skills', 'concepts', 'author'])
    expect(sectionFilters('lessons')).toEqual([
      'type', 'level', 'instrument', 'language', 'skills', 'concepts', 'author',
    ])
    expect(sectionFilters('paths')).toEqual(['level', 'instrument', 'language', 'skills', 'concepts', 'author'])
    expect(sectionFilters('courses')).toEqual(['level', 'instrument', 'language', 'skills', 'concepts', 'author'])
  })
})

describe('sectionStatuses', () => {
  it('gives status chips only to the sections with a publish state', () => {
    expect(sectionStatuses('courses')).toEqual(['draft', 'published', 'retired'])
    expect(sectionStatuses('paths')).toEqual(['draft', 'published'])
    expect(sectionStatuses('lessons')).toEqual(['draft', 'published', 'unpublished_changes'])
    expect(sectionStatuses('exercises')).toEqual([])
    expect(sectionStatuses('diagrams')).toEqual([])
  })
})

describe('parseListQuery', () => {
  it('reads an empty query as no search, no filters, sorted by name', () => {
    expect(parseListQuery('diagrams', {})).toEqual(emptyListState())
    expect(emptyListState()).toEqual({
      q: '',
      sort: 'title',
      status: null,
      filters: { skills: [], concepts: [] },
    })
  })

  it('reads every diagram filter, the search and the sort', () => {
    const state = parseListQuery('diagrams', {
      q: 'pentatonic',
      sort: 'updated',
      instrument: SKILL_B,
      kind: 'custom',
      shows: 'chord_voicings',
      root: 'A',
      language: 'pt-BR',
      skill: [SKILL_A, SKILL_B],
      concept: SKILL_A,
      author: AUTHOR,
    })

    expect(state).toEqual({
      q: 'pentatonic',
      sort: 'updated',
      status: null,
      filters: {
        instrument: SKILL_B,
        kind: 'custom',
        shows: 'chord_voicings',
        root: 'A',
        language: 'pt-BR',
        skills: [SKILL_A, SKILL_B],
        concepts: [SKILL_A],
        author: AUTHOR,
      },
    })
  })

  it('ignores a filter the section does not take', () => {
    const state = parseListQuery('exercises', { root: 'A', kind: 'custom', shows: 'both' })
    expect(state.filters).toEqual({ skills: [], concepts: [] })
  })

  it('ignores values the section does not offer', () => {
    const state = parseListQuery('paths', {
      sort: 'popular',
      status: 'retired',
      level: 'grandmaster',
      language: 'not a language',
      skill: ['not-a-uuid', SKILL_A],
      author: 'someone',
    })

    expect(state.sort).toBe('title')
    expect(state.status).toBeNull()
    expect(state.filters).toEqual({ skills: [SKILL_A], concepts: [] })
  })

  it('reads the type each section offers', () => {
    expect(parseListQuery('exercises', { type: 'audio_recognition' }).filters.type).toBe('audio_recognition')
    expect(parseListQuery('exercises', { type: 'video' }).filters.type).toBeUndefined()
    expect(parseListQuery('lessons', { type: 'video' }).filters.type).toBe('video')
  })

  it('reads the status chip of a section with a publish state', () => {
    expect(parseListQuery('lessons', { status: 'unpublished_changes' }).status).toBe('unpublished_changes')
    expect(parseListQuery('exercises', { status: 'draft' }).status).toBeNull()
  })

  it('reads one root note from the chromatic scale', () => {
    expect(parseListQuery('diagrams', { root: 'F#' }).filters.root).toBe('F#')
    expect(parseListQuery('diagrams', { root: 'H' }).filters.root).toBeUndefined()
    expect(parseListQuery('diagrams', { root: ['A', 'E'] }).filters.root).toBeUndefined()
  })
})

describe('toListQuery', () => {
  it('leaves out everything at its default', () => {
    expect(toListQuery(emptyListState())).toEqual({})
  })

  it('writes what parseListQuery reads', () => {
    const query = {
      q: 'pentatonic',
      sort: 'updated',
      kind: 'custom',
      root: 'A',
      skill: [SKILL_A, SKILL_B],
      author: AUTHOR,
    }
    expect(toListQuery(parseListQuery('diagrams', query))).toEqual(query)
  })

  it('trims the search', () => {
    expect(toListQuery({ ...emptyListState(), q: '  box 2 ' })).toEqual({ q: 'box 2' })
  })
})

describe('hasListQuery', () => {
  it('tells an address that names a list state from one that does not', () => {
    expect(hasListQuery({})).toBe(false)
    expect(hasListQuery({ from: 'teach' })).toBe(false)
    expect(hasListQuery({ sort: 'updated' })).toBe(true)
    expect(hasListQuery({ skill: SKILL_A })).toBe(true)
  })
})

describe('activeFilterCount', () => {
  it('counts each filter once, and each chosen skill and concept', () => {
    const state = parseListQuery('diagrams', {
      q: 'box',
      sort: 'updated',
      kind: 'custom',
      root: 'A',
      skill: [SKILL_A, SKILL_B],
    })
    expect(activeFilterCount(state)).toBe(4)
  })

  it('does not count the search, the sort or the status chip', () => {
    expect(activeFilterCount(parseListQuery('lessons', { q: 'x', sort: 'updated', status: 'draft' }))).toBe(0)
  })
})
