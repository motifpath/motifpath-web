import type { operations } from '@/api/generated/core-domain'
import { LEVELS, type AuthoringListState } from '@/features/teacher/utils/authoringListQuery'

type QueryOf<K extends keyof operations> = NonNullable<operations[K]['parameters']['query']>

export type DiagramsQuery = Omit<QueryOf<'listDiagrams'>, 'limit' | 'offset'>
export type ExercisesQuery = Omit<QueryOf<'listExercises'>, 'limit' | 'offset'>
export type LessonsQuery = Omit<QueryOf<'listContentNodes'>, 'limit' | 'offset'>
export type PathsQuery = Omit<QueryOf<'listLearningPaths'>, 'limit' | 'offset'>
export type CoursesQuery = Omit<QueryOf<'listCourses'>, 'limit' | 'offset'>

const EXERCISE_TYPES = [
  'image_recognition',
  'image_choice',
  'audio_recognition',
  'audio_selection',
  'text_response',
] as const satisfies readonly NonNullable<ExercisesQuery['exercise_type']>[]
const LESSON_TYPES = ['video', 'article'] as const satisfies readonly NonNullable<LessonsQuery['content_type']>[]
const LESSON_STATUSES = ['draft', 'published', 'unpublished_changes'] as const satisfies readonly NonNullable<
  LessonsQuery['status']
>[]
const PATH_STATUSES = ['draft', 'published'] as const satisfies readonly NonNullable<PathsQuery['status']>[]
const COURSE_STATUSES = ['draft', 'published', 'retired'] as const satisfies readonly NonNullable<
  CoursesQuery['status']
>[]

function pick<T extends string>(value: string | null | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((option) => option === value)
}

/** What every authoring list takes the same way: sort, language, skills, concepts, author. */
function shared(state: AuthoringListState) {
  const { language, skills, concepts, author } = state.filters
  return {
    ...(state.sort === 'updated' ? { sort: 'updated' as const } : {}),
    ...(language ? { language } : {}),
    ...(skills.length ? { skill_ids: [...skills] } : {}),
    ...(concepts.length ? { concept_ids: [...concepts] } : {}),
    ...(author ? { created_by: author } : {}),
  }
}

function instrument(state: AuthoringListState) {
  const id = state.filters.instrument
  return id ? { instrument_id: id } : {}
}

function search(state: AuthoringListState) {
  const q = state.q.trim()
  return q ? { q } : {}
}

function levels(state: AuthoringListState) {
  const level = pick(state.filters.level, LEVELS)
  return level ? { levels: [level] } : {}
}

export function diagramsQuery(state: AuthoringListState): DiagramsQuery {
  const { kind, shows, root } = state.filters
  const name = state.q.trim()
  return {
    ...(name ? { name } : {}),
    ...shared(state),
    ...instrument(state),
    ...(kind ? { kind: kind === 'templates' ? ('basic' as const) : ('custom' as const) } : {}),
    ...(shows ? { purpose: shows === 'both' ? ('any' as const) : ('chord_voicing' as const) } : {}),
    ...(root ? { root_note: root } : {}),
  }
}

export function exercisesQuery(state: AuthoringListState): ExercisesQuery {
  const type = pick(state.filters.type, EXERCISE_TYPES)
  const id = state.filters.instrument
  return {
    ...search(state),
    ...shared(state),
    ...(id ? { instrument_id: [id] } : {}),
    ...(type ? { exercise_type: type } : {}),
  }
}

export function lessonsQuery(state: AuthoringListState): LessonsQuery {
  const type = pick(state.filters.type, LESSON_TYPES)
  const level = pick(state.filters.level, LEVELS)
  const status = pick(state.status, LESSON_STATUSES)
  return {
    ...search(state),
    ...shared(state),
    ...instrument(state),
    ...(type ? { content_type: type } : {}),
    ...(level ? { difficulty_level: level } : {}),
    ...(status ? { status } : {}),
  }
}

export function pathsQuery(state: AuthoringListState): PathsQuery {
  const status = pick(state.status, PATH_STATUSES)
  return { ...search(state), ...shared(state), ...instrument(state), ...levels(state), ...(status ? { status } : {}) }
}

export function coursesQuery(state: AuthoringListState): CoursesQuery {
  const status = pick(state.status, COURSE_STATUSES)
  return { ...search(state), ...shared(state), ...instrument(state), ...levels(state), ...(status ? { status } : {}) }
}
