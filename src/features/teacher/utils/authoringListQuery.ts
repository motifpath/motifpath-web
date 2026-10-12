import type { LocationQuery, LocationQueryRaw } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'

type Exercise = components['schemas']['Exercise']

/** The Teach sections whose items are listed with search, filters and sort. */
export type AuthoringSection = 'courses' | 'paths' | 'lessons' | 'exercises' | 'diagrams'

export type AuthoringSort = 'title' | 'updated'

export type FilterKey =
  | 'type'
  | 'level'
  | 'instrument'
  | 'kind'
  | 'shows'
  | 'root'
  | 'language'
  | 'skills'
  | 'concepts'
  | 'author'

export type DiagramKindChoice = 'templates' | 'custom'
/** What a diagram list shows besides its default, plain diagrams. */
export type DiagramShowsChoice = 'chord_voicings' | 'both'

export interface AuthoringListFilters {
  type?: string
  level?: string
  instrument?: string
  kind?: DiagramKindChoice
  shows?: DiagramShowsChoice
  root?: string
  language?: string
  skills: string[]
  concepts: string[]
  author?: string
}

export interface AuthoringListState {
  q: string
  sort: AuthoringSort
  /** The status chip; null is "All". */
  status: string | null
  filters: AuthoringListFilters
}

const SECTION_FILTERS: Record<AuthoringSection, FilterKey[]> = {
  diagrams: ['instrument', 'kind', 'shows', 'root', 'language', 'skills', 'concepts', 'author'],
  exercises: ['type', 'instrument', 'language', 'skills', 'concepts', 'author'],
  lessons: ['type', 'level', 'instrument', 'language', 'skills', 'concepts', 'author'],
  paths: ['level', 'instrument', 'language', 'skills', 'concepts', 'author'],
  courses: ['level', 'instrument', 'language', 'skills', 'concepts', 'author'],
}

const SECTION_STATUSES: Record<AuthoringSection, string[]> = {
  courses: ['draft', 'published', 'retired'],
  paths: ['draft', 'published'],
  lessons: ['draft', 'published', 'unpublished_changes'],
  exercises: [],
  diagrams: [],
}

const EXERCISE_TYPES: Exercise['exercise_type'][] = [
  'image_recognition',
  'image_choice',
  'audio_recognition',
  'audio_selection',
  'text_response',
]

const SECTION_TYPES: Partial<Record<AuthoringSection, readonly string[]>> = {
  exercises: EXERCISE_TYPES,
  lessons: ['video', 'article'],
}

export const LEVELS = ['beginner', 'early_intermediate', 'intermediate', 'advanced', 'expert'] as const
export const DIAGRAM_KINDS: DiagramKindChoice[] = ['templates', 'custom']
export const DIAGRAM_SHOWS: DiagramShowsChoice[] = ['chord_voicings', 'both']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Z]{2})?$/

/** The query keys a list state is written under; any of them means the address names a state. */
const STATE_KEYS = ['q', 'sort', 'status', 'type', 'level', 'instrument', 'kind', 'shows', 'root', 'language', 'skill', 'concept', 'author']

export function sectionFilters(section: AuthoringSection): FilterKey[] {
  return SECTION_FILTERS[section]
}

export function sectionStatuses(section: AuthoringSection): string[] {
  return SECTION_STATUSES[section]
}

export function sectionTypes(section: AuthoringSection): readonly string[] {
  return SECTION_TYPES[section] ?? []
}

export function emptyListState(): AuthoringListState {
  return { q: '', sort: 'title', status: null, filters: { skills: [], concepts: [] } }
}

function single(value: LocationQuery[string] | undefined): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function many(value: LocationQuery[string] | undefined): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values.filter((v): v is string => typeof v === 'string' && UUID.test(v))
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((option) => option === value)
}

function matching(value: string | undefined, pattern: RegExp): string | undefined {
  return value !== undefined && pattern.test(value) ? value : undefined
}

/** Reads a section's list state from an address, keeping only what that section offers. */
export function parseListQuery(section: AuthoringSection, query: LocationQuery): AuthoringListState {
  const offered = new Set(SECTION_FILTERS[section])
  const filters: AuthoringListFilters = { skills: [], concepts: [] }
  const read: { [K in Exclude<FilterKey, 'skills' | 'concepts'>]: () => string | undefined } = {
    type: () => oneOf(single(query.type), sectionTypes(section)),
    level: () => oneOf(single(query.level), LEVELS),
    instrument: () => matching(single(query.instrument), UUID),
    kind: () => oneOf(single(query.kind), DIAGRAM_KINDS),
    shows: () => oneOf(single(query.shows), DIAGRAM_SHOWS),
    root: () => oneOf(single(query.root), CHROMATIC_SCALE),
    language: () => matching(single(query.language), LANGUAGE_CODE),
    author: () => matching(single(query.author), UUID),
  }
  for (const key of offered) {
    if (key === 'skills') filters.skills = many(query.skill)
    else if (key === 'concepts') filters.concepts = many(query.concept)
    else {
      const value = read[key]()
      if (value !== undefined) Object.assign(filters, { [key]: value })
    }
  }

  return {
    q: single(query.q) ?? '',
    sort: oneOf(single(query.sort), ['title', 'updated'] as const) ?? 'title',
    status: oneOf(single(query.status), SECTION_STATUSES[section]) ?? null,
    filters,
  }
}

/** Writes a list state as an address query, leaving out everything at its default. */
export function toListQuery(state: AuthoringListState): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  const q = state.q.trim()
  if (q) query.q = q
  if (state.sort !== 'title') query.sort = state.sort
  if (state.status) query.status = state.status
  const { skills, concepts, ...singles } = state.filters
  for (const [key, value] of Object.entries(singles)) if (value) query[key] = value
  if (skills.length) query.skill = [...skills]
  if (concepts.length) query.concept = [...concepts]
  return query
}

export function hasListQuery(query: LocationQuery): boolean {
  return STATE_KEYS.some((key) => key in query)
}

/** How many filters are applied: one each, plus one per chosen skill and concept. */
export function activeFilterCount(state: AuthoringListState): number {
  const { skills, concepts, ...singles } = state.filters
  return Object.values(singles).filter(Boolean).length + skills.length + concepts.length
}
