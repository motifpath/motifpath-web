import { describe, expect, it } from 'vitest'

import {
  makeCurrentPath as currentPath,
  makeEnrollment as enrollment,
  makeStandalonePath as standalonePath,
} from '@/features/student/testing/learning'
import { buildLearning, nextInProgress } from '@/features/student/utils/learning'

function titles(items: { title: string }[]) {
  return items.map((item) => item.title)
}

describe('buildLearning', () => {
  it('groups courses and paths together by where the student is', () => {
    const groups = buildLearning(
      [
        enrollment({ course_enrollment_id: 'e-1', course_title: 'Guitar foundations' }),
        enrollment({ course_enrollment_id: 'e-2', course_title: 'First songs', status: 'completed' }),
        enrollment({ course_enrollment_id: 'e-3', course_title: 'Blues basics', status: 'abandoned' }),
      ],
      [standalonePath({ title: 'Open chords' })],
      null,
    )

    expect(titles(groups.inProgress)).toEqual(['Guitar foundations', 'Open chords'])
    expect(titles(groups.finished)).toEqual(['First songs'])
    expect(titles(groups.left)).toEqual(['Blues basics'])
  })

  it('puts a removed standalone path under Left', () => {
    const groups = buildLearning([], [standalonePath({ archived_at: '2026-09-20T00:00:00Z' })], null)

    expect(groups.left).toHaveLength(1)
    expect(groups.inProgress).toHaveLength(0)
  })

  it('puts a standalone path with every lesson done under Finished', () => {
    const groups = buildLearning([], [standalonePath({ lesson_count: 9, completed_count: 9 })], null)

    expect(groups.finished).toHaveLength(1)
    expect(groups.finished[0]?.state).toBe('finished')
  })

  it('keeps an empty standalone path in progress', () => {
    const groups = buildLearning([], [standalonePath({ lesson_count: 0, completed_count: 0 })], null)

    expect(groups.inProgress).toHaveLength(1)
  })

  it('lists the current item first, then the most recently started', () => {
    const groups = buildLearning(
      [
        enrollment({ course_enrollment_id: 'e-1', course_title: 'Guitar foundations', enrolled_at: '2026-09-01T00:00:00Z' }),
        enrollment({ course_enrollment_id: 'e-2', course_title: 'Reading rhythm', enrolled_at: '2026-09-03T00:00:00Z' }),
      ],
      [standalonePath({ title: 'Open chords', assigned_at: '2026-09-02T00:00:00Z' })],
      currentPath({ course_enrollment_id: 'e-1' }),
    )

    expect(titles(groups.inProgress)).toEqual(['Guitar foundations', 'Reading rhythm', 'Open chords'])
  })

  it('orders Finished and Left by most recently started too', () => {
    const groups = buildLearning(
      [
        enrollment({ course_enrollment_id: 'e-1', course_title: 'Older', status: 'completed', enrolled_at: '2026-08-01T00:00:00Z' }),
        enrollment({ course_enrollment_id: 'e-2', course_title: 'Newer', status: 'completed', enrolled_at: '2026-09-01T00:00:00Z' }),
      ],
      [],
      null,
    )

    expect(titles(groups.finished)).toEqual(['Newer', 'Older'])
  })

  it('marks the current course enrolment as current', () => {
    const groups = buildLearning(
      [enrollment({ course_enrollment_id: 'e-1' }), enrollment({ course_enrollment_id: 'e-2' })],
      [],
      currentPath({ course_enrollment_id: 'e-2' }),
    )

    expect(groups.inProgress.map((item) => item.state)).toEqual(['current', 'in-progress'])
    expect(groups.inProgress[0]?.target).toEqual({ courseEnrollmentId: 'e-2' })
  })

  it('marks the current standalone path as current', () => {
    const groups = buildLearning(
      [enrollment()],
      [standalonePath({ student_path_id: 'sp-1' })],
      currentPath({ student_path_id: 'sp-1', course_enrollment_id: undefined }),
    )

    expect(groups.inProgress[0]?.kind).toBe('path')
    expect(groups.inProgress[0]?.state).toBe('current')
    expect(groups.inProgress[0]?.target).toEqual({ studentPathId: 'sp-1' })
  })

  it('counts a course in parts: the parts before the active one are done', () => {
    const [item] = buildLearning(
      [enrollment({ active_checkpoint_position: 2, checkpoint_count: 4 })],
      [],
      null,
    ).inProgress

    expect(item?.part).toEqual({ position: 2, count: 4 })
    expect(item?.progress).toEqual({ completed: 1, total: 4, unit: 'parts' })
  })

  it('fills the bar of a finished course', () => {
    const [item] = buildLearning([enrollment({ status: 'completed', checkpoint_count: 4 })], [], null).finished

    expect(item?.progress).toEqual({ completed: 4, total: 4, unit: 'parts' })
  })

  it('counts a path in lessons', () => {
    const [item] = buildLearning([], [standalonePath({ lesson_count: 9, completed_count: 5 })], null).inProgress

    expect(item?.progress).toEqual({ completed: 5, total: 9, unit: 'lessons' })
  })

  it('shows no progress on a left item', () => {
    const [item] = buildLearning([enrollment({ status: 'abandoned' })], [], null).left

    expect(item?.progress).toBeNull()
  })

  it('names the teacher who assigned a path, and nobody when the student enrolled themselves', () => {
    const groups = buildLearning(
      [],
      [
        standalonePath({ student_path_id: 'sp-1', assigned_by: { user_id: 't-1', display_name: 'Ana Lima' } }),
        standalonePath({ student_path_id: 'sp-2', assigned_at: '2026-08-01T00:00:00Z' }),
      ],
      null,
    )

    expect(groups.inProgress.map((item) => item.assignedBy)).toEqual(['Ana Lima', undefined])
  })

  it('keeps what a detail page needs: the course id, or the path template id', () => {
    const groups = buildLearning([enrollment({ course_id: 'c-9' })], [standalonePath({ source_template_id: 'lp-9' })], null)

    expect(groups.inProgress.map((item) => item.detailId)).toEqual(['c-9', 'lp-9'])
  })

  it('carries the thumbnail', () => {
    const groups = buildLearning(
      [enrollment({ course_thumbnail_url: 'https://cdn/course.jpg' })],
      [standalonePath({ thumbnail_url: 'https://cdn/path.jpg' })],
      null,
    )

    expect(groups.inProgress.map((item) => item.thumbnailUrl)).toEqual(['https://cdn/course.jpg', 'https://cdn/path.jpg'])
  })
})

describe('nextInProgress', () => {
  const groups = buildLearning(
    [
      enrollment({ course_enrollment_id: 'e-1', course_title: 'Guitar foundations', enrolled_at: '2026-09-01T00:00:00Z' }),
      enrollment({ course_enrollment_id: 'e-2', course_title: 'Reading rhythm', enrolled_at: '2026-09-03T00:00:00Z' }),
    ],
    [],
    currentPath({ course_enrollment_id: 'e-1' }),
  )

  it('is the first other item in progress', () => {
    expect(nextInProgress(groups, groups.inProgress[0]!)?.title).toBe('Reading rhythm')
  })

  it('is nothing when the item is the only one in progress', () => {
    const only = buildLearning([enrollment()], [], currentPath())

    expect(nextInProgress(only, only.inProgress[0]!)).toBeNull()
  })
})
