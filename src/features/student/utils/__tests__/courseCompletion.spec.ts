import { describe, expect, it } from 'vitest'

import { makeStudentPathItem, makeStudentPathView } from '@/features/student/testing/studentPathItem'
import { completedCourseEnrollmentId } from '@/features/student/utils/courseCompletion'

const finished = [makeStudentPathItem(1, undefined, 'completed')]

describe('completedCourseEnrollmentId', () => {
  it('is the enrollment id when the view reports that it just completed the course', () => {
    const view = makeStudentPathView(finished, {
      course_completed: true,
      course_enrollment_id: 'ce-1',
      course_checkpoint_position: 3,
    })

    expect(completedCourseEnrollmentId(view)).toBe('ce-1')
  })

  it('is null while the course is still in progress', () => {
    const view = makeStudentPathView(finished, { course_enrollment_id: 'ce-1', course_checkpoint_position: 1 })

    expect(completedCourseEnrollmentId(view)).toBeNull()
  })

  it('is null for a standalone path, or when there is no view', () => {
    expect(completedCourseEnrollmentId(makeStudentPathView(finished))).toBeNull()
    expect(completedCourseEnrollmentId(null)).toBeNull()
  })
})
