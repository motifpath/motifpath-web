import type { LocationQuery } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { OFFERED_LANGUAGE_CODES } from '@/i18n'

export type CatalogLevel = components['schemas']['CourseCatalogEntry']['level']

/** The levels a student can filter by, easiest first. */
export const CATALOG_LEVELS: readonly CatalogLevel[] = [
  'beginner',
  'early_intermediate',
  'intermediate',
  'advanced',
  'expert',
]

/**
 * What Discover is filtered by. Levels can be several; instrument, language and teacher are one
 * each. Skills and concepts never come from the filters themselves, only from the place that
 * opened Discover.
 */
export interface DiscoverFilters {
  levels: CatalogLevel[]
  instrument?: string
  language?: string
  /** A teacher's user id. */
  teacher?: string
  skills: string[]
  concepts: string[]
}

/** Discover's search and filters, shared by both segments. */
export interface DiscoverState {
  q: string
  filters: DiscoverFilters
}

/** The query both catalog endpoints take. */
export interface CatalogQuery {
  q?: string
  levels?: CatalogLevel[]
  instrument_id?: string
  language?: string
  created_by?: string
  skill_ids?: string[]
  concept_ids?: string[]
}

const STATE_KEYS = ['q', 'level', 'instrument', 'language', 'teacher', 'skill_ids', 'concept_ids']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function emptyDiscoverState(): DiscoverState {
  return { q: '', filters: { levels: [], skills: [], concepts: [] } }
}

function single(value: LocationQuery[string] | undefined): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function all(value: LocationQuery[string] | undefined): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values.filter((v): v is string => typeof v === 'string')
}

function isLevel(value: string): value is CatalogLevel {
  return CATALOG_LEVELS.some((level) => level === value)
}

function id(value: string | undefined): string | undefined {
  return value !== undefined && UUID.test(value) ? value : undefined
}

/** Reads Discover's state from an address, keeping only what Discover offers. */
export function parseDiscoverQuery(query: LocationQuery): DiscoverState {
  const filters: DiscoverFilters = {
    levels: all(query.level).filter(isLevel),
    skills: all(query.skill_ids).filter((v) => UUID.test(v)),
    concepts: all(query.concept_ids).filter((v) => UUID.test(v)),
  }
  const instrument = id(single(query.instrument))
  if (instrument) filters.instrument = instrument
  const language = single(query.language)
  if (language && OFFERED_LANGUAGE_CODES.includes(language)) filters.language = language
  const teacher = id(single(query.teacher))
  if (teacher) filters.teacher = teacher
  return { q: single(query.q) ?? '', filters }
}

/** An address query as Discover writes it: only strings and lists of strings. */
export type DiscoverQuery = Record<string, string | string[]>

/** Writes Discover's state as an address query, leaving out everything unset. */
export function toDiscoverQuery(state: DiscoverState): DiscoverQuery {
  const query: DiscoverQuery = {}
  const q = state.q.trim()
  if (q) query.q = q
  const { levels, instrument, language, teacher, skills, concepts } = state.filters
  if (levels.length) query.level = [...levels]
  if (instrument) query.instrument = instrument
  if (language) query.language = language
  if (teacher) query.teacher = teacher
  if (skills.length) query.skill_ids = [...skills]
  if (concepts.length) query.concept_ids = [...concepts]
  return query
}

export function hasDiscoverQuery(query: LocationQuery): boolean {
  return STATE_KEYS.some((key) => key in query)
}

/** How many filters are on: one per level, skill and concept, and one per single filter. */
export function activeFilterCount(filters: DiscoverFilters): number {
  const singles = [filters.instrument, filters.language, filters.teacher].filter(Boolean).length
  return filters.levels.length + filters.skills.length + filters.concepts.length + singles
}

export function toCatalogQuery(state: DiscoverState): CatalogQuery {
  const query: CatalogQuery = {}
  const q = state.q.trim()
  if (q) query.q = q
  const { levels, instrument, language, teacher, skills, concepts } = state.filters
  if (levels.length) query.levels = [...levels]
  if (instrument) query.instrument_id = instrument
  if (language) query.language = language
  if (teacher) query.created_by = teacher
  if (skills.length) query.skill_ids = [...skills]
  if (concepts.length) query.concept_ids = [...concepts]
  return query
}
