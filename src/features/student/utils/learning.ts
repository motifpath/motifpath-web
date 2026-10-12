import type { components } from '@/api/generated/core-domain'
import type { CurrentPathTarget } from '@/features/student/composables/useSetCurrentPath'

type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']
type StudentPathView = components['schemas']['StudentPathView']

export type LearningState = 'current' | 'in-progress' | 'finished' | 'left'

/** One row of Learning: a course enrolment or a standalone path, read the same way. */
export interface LearningItem {
  /** Unique across courses and paths. */
  key: string
  kind: 'course' | 'path'
  title: string
  thumbnailUrl?: string
  state: LearningState
  /** A course's active part; absent for a path. */
  part?: { position: number; count: number }
  /** Who assigned a path, when it was not the student. */
  assignedBy?: string
  /** A course counts parts and a path lessons. A left item has none. */
  progress: { completed: number; total: number; unit: 'parts' | 'lessons' } | null
  /** What to make current to continue it. */
  target: CurrentPathTarget
  /** The course id or the path template id, for its detail page. */
  detailId: string
  /** When it was started, the order within a group. */
  startedAt: string
}

export interface LearningGroups {
  inProgress: LearningItem[]
  finished: LearningItem[]
  left: LearningItem[]
}

function fromEnrollment(enrollment: CourseEnrollment, current: StudentPathView | null): LearningItem {
  const count = enrollment.checkpoint_count
  const position = enrollment.active_checkpoint_position
  const state: LearningState =
    enrollment.status === 'completed'
      ? 'finished'
      : enrollment.status === 'abandoned'
        ? 'left'
        : current?.course_enrollment_id === enrollment.course_enrollment_id
          ? 'current'
          : 'in-progress'

  let progress: LearningItem['progress'] = null
  if (count !== undefined && state === 'finished') progress = { completed: count, total: count, unit: 'parts' }
  // The enrolment knows only which part is active, so the parts before it are the done ones.
  else if (count !== undefined && position && state !== 'left') progress = { completed: position - 1, total: count, unit: 'parts' }

  return {
    key: `course:${enrollment.course_enrollment_id}`,
    kind: 'course',
    title: enrollment.course_title,
    thumbnailUrl: enrollment.course_thumbnail_url,
    state,
    part: position && count !== undefined && state !== 'left' ? { position, count } : undefined,
    progress,
    target: { courseEnrollmentId: enrollment.course_enrollment_id },
    detailId: enrollment.course_id,
    startedAt: enrollment.enrolled_at,
  }
}

function fromStandalonePath(path: StudentPath, current: StudentPathView | null): LearningItem {
  const finished = path.lesson_count > 0 && path.completed_count >= path.lesson_count
  const state: LearningState = path.archived_at
    ? 'left'
    : finished
      ? 'finished'
      : current && !current.course_enrollment_id && current.student_path_id === path.student_path_id
        ? 'current'
        : 'in-progress'

  return {
    key: `path:${path.student_path_id}`,
    kind: 'path',
    title: path.title,
    thumbnailUrl: path.thumbnail_url,
    state,
    assignedBy: path.assigned_by.user_id !== path.student.user_id ? path.assigned_by.display_name : undefined,
    progress: state === 'left' ? null : { completed: path.completed_count, total: path.lesson_count, unit: 'lessons' },
    target: { studentPathId: path.student_path_id },
    detailId: path.source_template_id,
    startedAt: path.assigned_at,
  }
}

// Current first, then the most recently started; there is no last-activity time to sort by.
function byCurrentThenNewest(a: LearningItem, b: LearningItem): number {
  if (a.state === 'current' || b.state === 'current') return a.state === 'current' ? -1 : 1
  return b.startedAt.localeCompare(a.startedAt)
}

/** Every course enrolment and standalone path of the student, in Learning's three groups. */
export function buildLearning(
  enrollments: CourseEnrollment[],
  paths: StudentPath[],
  current: StudentPathView | null,
): LearningGroups {
  const items = [
    ...enrollments.map((enrollment) => fromEnrollment(enrollment, current)),
    ...paths.map((path) => fromStandalonePath(path, current)),
  ].sort(byCurrentThenNewest)

  return {
    inProgress: items.filter((item) => item.state === 'current' || item.state === 'in-progress'),
    finished: items.filter((item) => item.state === 'finished'),
    left: items.filter((item) => item.state === 'left'),
  }
}

/** The item that becomes current when this one is left: the first other one in progress. */
export function nextInProgress(groups: LearningGroups, item: LearningItem): LearningItem | null {
  return groups.inProgress.find((other) => other.key !== item.key) ?? null
}
