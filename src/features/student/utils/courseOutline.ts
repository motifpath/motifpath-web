import type { components } from '@/api/generated/core-domain'

type CourseDetail = components['schemas']['CourseDetail']
type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPathView = components['schemas']['StudentPathView']

/** Where the student stands with a course, read from all their enrolments in it. */
export type CourseStanding =
  | { kind: 'enrolled'; enrollment: CourseEnrollment }
  | { kind: 'finished'; enrollment: CourseEnrollment }
  | { kind: 'left' }
  | { kind: 'none' }

/**
 * A student can hold several enrolments in one course over time (left, then started again); the
 * one in progress wins, then a finished one, then having left it.
 */
export function courseStanding(enrollments: CourseEnrollment[], courseId: string): CourseStanding {
  const mine = enrollments.filter((enrollment) => enrollment.course_id === courseId)
  const active = mine.find((enrollment) => enrollment.status === 'active')
  if (active) return { kind: 'enrolled', enrollment: active }
  const finished = mine.find((enrollment) => enrollment.status === 'completed')
  if (finished) return { kind: 'finished', enrollment: finished }
  return mine.length ? { kind: 'left' } : { kind: 'none' }
}

export interface OutlineLesson {
  title: string
  /** Known only for the current part of the current course. */
  done?: boolean
}

export interface OutlinePart {
  position: number
  title: string
  state: 'done' | 'current' | 'upcoming'
  lessonCount: number
  /** How many lessons of the current part are done; null when unknown. */
  lessonsDone: number | null
  lessons: OutlineLesson[]
}

/**
 * The course's parts as the student sees them. Only the current path is read with its lessons'
 * progress, so the current part counts its lessons only when this course is the current one; it is
 * then listed from that path, which is the student's own copy of the part.
 */
export function buildCourseOutline(
  course: CourseDetail,
  standing: CourseStanding,
  current: StudentPathView | null,
): OutlinePart[] {
  const activePosition = standing.kind === 'enrolled' ? standing.enrollment.active_checkpoint_position : null
  const ownPath =
    standing.kind === 'enrolled' && current?.course_enrollment_id === standing.enrollment.course_enrollment_id
      ? current
      : null

  return course.checkpoints.map((checkpoint) => {
    const state: OutlinePart['state'] =
      standing.kind === 'finished'
        ? 'done'
        : activePosition == null
          ? 'upcoming'
          : checkpoint.position < activePosition
            ? 'done'
            : checkpoint.position === activePosition
              ? 'current'
              : 'upcoming'

    if (state === 'current' && ownPath) {
      const lessons = ownPath.items.map((item) => ({ title: item.title, done: item.status === 'completed' }))
      return {
        position: checkpoint.position,
        title: checkpoint.title,
        state,
        lessonCount: lessons.length,
        lessonsDone: lessons.filter((lesson) => lesson.done).length,
        lessons,
      }
    }

    return {
      position: checkpoint.position,
      title: checkpoint.title,
      state,
      lessonCount: checkpoint.items.length,
      lessonsDone: null,
      lessons: checkpoint.items.map((item) => ({ title: item.title })),
    }
  })
}

/** One lesson of a finished part, as a row that opens it for review. */
export interface FinishedLesson {
  position: number
  title: string
  kind: StudentPathView['items'][number]['content_type']
  contentNodeId: string
}

/** A finished part: its place in the outline, the copy it was taken from, and its lessons. */
export interface FinishedPart {
  part: OutlinePart
  studentPathId: string
  lessons: FinishedLesson[]
}

/**
 * A finished course's outline, from the parts the student took — never a newer version of the
 * course. Every part is done, and its lessons are the student's own copies, to open for review.
 */
export function buildFinishedOutline(parts: StudentPathView[]): FinishedPart[] {
  return parts.map((view, index) => {
    const lessons = view.items.map((item) => ({
      position: item.position,
      title: item.title,
      kind: item.content_type,
      contentNodeId: item.content_node_id,
    }))
    return {
      part: {
        position: view.course_checkpoint_position ?? index + 1,
        title: view.title,
        state: 'done',
        lessonCount: lessons.length,
        lessonsDone: null,
        lessons: lessons.map(({ title }) => ({ title })),
      },
      studentPathId: view.student_path_id,
      lessons,
    }
  })
}

export type LessonLine =
  | { kind: 'lesson'; title: string; done?: boolean }
  | { kind: 'more-done'; count: number }
  | { kind: 'more'; count: number }

const SHOWN_DONE = 2
const SHOWN_NEXT = 2

/**
 * The current part's lessons, short enough to read at a glance: the first done ones, how many more
 * are done, the next ones and how many follow. The full list is My path's. Without progress there
 * is nothing to fold around, so every title shows.
 */
export function foldCurrentLessons(lessons: OutlineLesson[]): LessonLine[] {
  if (lessons.some((lesson) => lesson.done === undefined)) {
    return lessons.map(({ title }) => ({ kind: 'lesson', title }))
  }

  const done = lessons.filter((lesson) => lesson.done)
  const next = lessons.filter((lesson) => !lesson.done)
  const line = (lesson: OutlineLesson): LessonLine => ({ kind: 'lesson', title: lesson.title, done: lesson.done })
  // Folding a single lesson would take as much room as showing it.
  const shownDone = done.length > SHOWN_DONE + 1 ? done.slice(0, SHOWN_DONE) : done
  const shownNext = next.length > SHOWN_NEXT + 1 ? next.slice(0, SHOWN_NEXT) : next

  return [
    ...shownDone.map(line),
    ...(shownDone.length < done.length ? [{ kind: 'more-done', count: done.length - shownDone.length } as const] : []),
    ...shownNext.map(line),
    ...(shownNext.length < next.length ? [{ kind: 'more', count: next.length - shownNext.length } as const] : []),
  ]
}
