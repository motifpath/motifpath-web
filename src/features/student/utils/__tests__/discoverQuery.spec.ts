import { describe, expect, it } from 'vitest'

import {
  activeFilterCount,
  emptyDiscoverState,
  hasDiscoverQuery,
  parseDiscoverQuery,
  toCatalogQuery,
  toDiscoverQuery,
} from '@/features/student/utils/discoverQuery'

const GUITAR = '3f4b6f2a-8c3e-4b1a-9d2e-7a1c5f0e9b21'
const TEACHER = '0b6f5d7e-1c2a-4e3b-9f8d-6a5b4c3d2e1f'
const SKILL = '7a2d9e10-4f3b-4c5a-8e6d-1b2c3d4e5f60'
const CONCEPT = '9c8b7a65-4321-4fed-8cba-0987654321ab'

describe('parseDiscoverQuery', () => {
  it('reads the search and every filter a student can have', () => {
    expect(
      parseDiscoverQuery({
        q: 'blues',
        level: ['beginner', 'intermediate'],
        instrument: GUITAR,
        language: 'en',
        teacher: TEACHER,
        skill_ids: SKILL,
        concept_ids: [CONCEPT],
      }),
    ).toEqual({
      q: 'blues',
      filters: {
        levels: ['beginner', 'intermediate'],
        instrument: GUITAR,
        language: 'en',
        teacher: TEACHER,
        skills: [SKILL],
        concepts: [CONCEPT],
      },
    })
  })

  it('drops values Discover does not offer', () => {
    expect(
      parseDiscoverQuery({
        level: ['beginner', 'legendary'],
        instrument: 'not-an-id',
        language: 'xx',
        teacher: '',
        skill_ids: ['nope'],
        sort: 'updated',
      }),
    ).toEqual({ q: '', filters: { levels: ['beginner'], skills: [], concepts: [] } })
  })

  it('reads an empty address as no search and no filters', () => {
    expect(parseDiscoverQuery({})).toEqual({ q: '', filters: { levels: [], skills: [], concepts: [] } })
  })
})

describe('toDiscoverQuery', () => {
  it('writes only what is set, so a bare list has a bare address', () => {
    expect(toDiscoverQuery(emptyDiscoverState())).toEqual({})
  })

  it('round-trips through the address', () => {
    const state = {
      q: 'shuffle',
      filters: { levels: ['advanced' as const], teacher: TEACHER, skills: [SKILL], concepts: [] },
    }
    expect(parseDiscoverQuery(toDiscoverQuery(state))).toEqual(state)
  })

  it('trims the search', () => {
    expect(toDiscoverQuery({ q: '  blues ', filters: { levels: [], skills: [], concepts: [] } })).toEqual({ q: 'blues' })
  })
})

describe('hasDiscoverQuery', () => {
  it('is true once the address names a search or a filter', () => {
    expect(hasDiscoverQuery({})).toBe(false)
    expect(hasDiscoverQuery({ returnFromCourse: 'c1' })).toBe(false)
    expect(hasDiscoverQuery({ q: 'blues' })).toBe(true)
    expect(hasDiscoverQuery({ teacher: TEACHER })).toBe(true)
  })
})

describe('activeFilterCount', () => {
  it('counts each level, skill and concept, and each single filter, but not the search', () => {
    expect(
      activeFilterCount({
        levels: ['beginner', 'intermediate'],
        instrument: GUITAR,
        skills: [SKILL],
        concepts: [],
      }),
    ).toBe(4)
  })
})

describe('toCatalogQuery', () => {
  it('names each filter the way both catalog endpoints take it', () => {
    expect(
      toCatalogQuery({
        q: 'blues',
        filters: {
          levels: ['beginner'],
          instrument: GUITAR,
          language: 'en',
          teacher: TEACHER,
          skills: [SKILL],
          concepts: [CONCEPT],
        },
      }),
    ).toEqual({
      q: 'blues',
      levels: ['beginner'],
      instrument_id: GUITAR,
      language: 'en',
      created_by: TEACHER,
      skill_ids: [SKILL],
      concept_ids: [CONCEPT],
    })
  })

  it('sends nothing for a bare list', () => {
    expect(toCatalogQuery(emptyDiscoverState())).toEqual({})
  })
})
