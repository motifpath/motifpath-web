import type { components } from '@/api/generated/core-domain'

type StudentPathView = components['schemas']['StudentPathView']

/**
 * The enrollment whose course this path view just completed, or null. The API
 * reports a completion only once — on the read that discovers it, after which
 * the student has no current path — so whichever screen receives it must act.
 */
export function completedCourseEnrollmentId(view: StudentPathView | null): string | null {
  return view?.course_completed ? (view.course_enrollment_id ?? null) : null
}
