import type { components } from '@/api/generated/core-domain'

type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']
type StudentPathView = components['schemas']['StudentPathView']

const alice = { user_id: 'st-1', display_name: 'Alice Souza' }

export function makeEnrollment(overrides: Partial<CourseEnrollment> = {}): CourseEnrollment {
  return {
    course_enrollment_id: 'e-1',
    student: alice,
    course_id: 'c-1',
    course_title: 'Guitar foundations',
    course_summary: 'From the first chord to the first song.',
    course_level: 'beginner',
    course_created_by: { user_id: 't-1', display_name: 'Ana Lima' },
    course_version_number: 1,
    checkpoint_count: 4,
    status: 'active',
    active_checkpoint_student_path_id: 'sp-e1',
    active_checkpoint_position: 2,
    enrolled_at: '2026-09-02T00:00:00Z',
    ...overrides,
  }
}

export function makeStandalonePath(overrides: Partial<StudentPath> = {}): StudentPath {
  return {
    student_path_id: 'sp-1',
    student: alice,
    source_template_id: 'lp-1',
    title: 'Open chords',
    // Enrolled by the student themselves unless a test says a teacher assigned it.
    assigned_by: alice,
    assigned_at: '2026-09-01T00:00:00Z',
    archived_at: null,
    source_course_enrollment_id: null,
    course_checkpoint_position: null,
    lesson_count: 9,
    completed_count: 5,
    ...overrides,
  }
}

/** The current path read, for a course part (the default) or, with no enrolment id, a standalone path. */
export function makeCurrentPath(overrides: Partial<StudentPathView> = {}): StudentPathView {
  return {
    student_path_id: 'sp-e1',
    source_template_id: 'lp-e1',
    title: 'Part 2',
    course_enrollment_id: 'e-1',
    course_checkpoint_position: 2,
    current_position: 1,
    items: [],
    course_completed: false,
    ...overrides,
  }
}
