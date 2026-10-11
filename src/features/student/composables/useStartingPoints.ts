import { ref, watch, type Ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { i18n, toApiLanguageCode } from '@/i18n'
import { useApi } from '@/shared/composables/useApi'

type Experience = components['schemas']['StartingPointExperience']
type Level = components['schemas']['PathCatalogEntry']['level']
type PathEntry = components['schemas']['PathCatalogEntry']
type CourseEntry = components['schemas']['CourseCatalogEntry']

/** A new student's two answers: what they want to play and how much they have played it. */
export interface FirstRunAnswers {
  instrumentId: string
  experience: Experience
}

/** One path or course a new student can start with, as Where to start shows it. */
export interface StartingPointItem {
  kind: 'path' | 'course'
  id: string
  title: string
  level: Level
  language: string
  lessonCount?: number
}

/**
 * `results`: the starting points for the answers. `closest`: none suited them, so these are the
 * instrument's other levels. `nothing`: the instrument has nothing in this language yet.
 */
export type StartingPointsState = 'idle' | 'loading' | 'failed' | 'results' | 'closest' | 'nothing'

// How many of the instrument's other levels to offer when nothing suits the answers.
const CLOSEST_LIMIT = 5

function fromPath(path: PathEntry): StartingPointItem {
  return { kind: 'path', id: path.learning_path_id, title: path.title, level: path.level, language: path.language, lessonCount: path.lesson_count }
}

function fromCourse(course: CourseEntry): StartingPointItem {
  return { kind: 'course', id: course.course_id, title: course.title, level: course.level, language: course.language, lessonCount: course.lesson_count }
}

/**
 * Where a new student should start, for their answers and the app's language: the starting points
 * core answers with, or — when none suit — the instrument's other levels, paths first. The answers
 * are only filters; nothing is stored.
 */
export function useStartingPoints(answers: Ref<FirstRunAnswers | null>) {
  const { coreApi } = useApi()
  const state = ref<StartingPointsState>('idle')
  const items = ref<StartingPointItem[]>([])
  let generation = 0

  async function closest(answer: FirstRunAnswers, language: string): Promise<StartingPointItem[] | null> {
    const query = { instrument_id: answer.instrumentId, language, limit: CLOSEST_LIMIT, offset: 0 }
    const [paths, courses] = await Promise.all([
      coreApi.GET('/catalog/paths', { params: { query } }),
      coreApi.GET('/catalog/courses', { params: { query } }),
    ])
    if (!paths.data || !courses.data) return null
    return [...paths.data.items.map(fromPath), ...courses.data.items.map(fromCourse)].slice(0, CLOSEST_LIMIT)
  }

  async function load() {
    const answer = answers.value
    const mine = ++generation
    if (!answer) {
      state.value = 'idle'
      items.value = []
      return
    }
    state.value = 'loading'
    const language = toApiLanguageCode(i18n.global.locale.value)
    try {
      const result = await coreApi.GET('/catalog/starting-points', {
        params: { query: { instrument_id: answer.instrumentId, experience: answer.experience, language } },
      })
      if (mine !== generation) return
      if (!result.data) {
        state.value = 'failed'
        return
      }
      const found = result.data.items.flatMap((point) =>
        point.kind === 'path' && point.path ? [fromPath(point.path)] : point.kind === 'course' && point.course ? [fromCourse(point.course)] : [],
      )
      if (found.length > 0) {
        items.value = found
        state.value = 'results'
        return
      }
      const others = await closest(answer, language)
      if (mine !== generation) return
      if (others === null) {
        state.value = 'failed'
        return
      }
      items.value = others
      state.value = others.length > 0 ? 'closest' : 'nothing'
    } catch {
      if (mine === generation) state.value = 'failed'
    }
  }

  watch([answers, () => i18n.global.locale.value], () => void load(), { immediate: true })

  return { state, items, retry: load }
}
