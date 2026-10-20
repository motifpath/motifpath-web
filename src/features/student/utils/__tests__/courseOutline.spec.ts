import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { makeCurrentPath, makeEnrollment } from '@/features/student/testing/learning'
import { buildCourseOutline, courseStanding, foldCurrentLessons } from '@/features/student/utils/courseOutline'

type CourseDetail = components['schemas']['CourseDetail']
type StudentPathItem = components['schemas']['StudentPathItem']

function titles(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({ title: `${prefix} ${index + 1}` }))
}

function course(): CourseDetail {
  return {
    course_id: 'c-1',
    title: 'Guitar foundations',
    summary: 'Chords, strumming and your first songs.',
    level: 'beginner',
    language: 'en',
    created_by: { user_id: 't-1', display_name: 'Ana Souza' },
    status: 'published',
    instrument_ids: [],
    checkpoint_count: 4,
    lesson_count: 44,
    checkpoints: [
      { position: 1, title: 'Open chords', items: titles('Open', 12) },
      { position: 2, title: 'Major triads', items: titles('Triad', 14) },
      { position: 3, title: 'Seventh chords', items: titles('Seventh', 10) },
      { position: 4, title: 'Accompany a song', items: titles('Song', 8) },
    ],
  }
}

function pathItem(position: number, status: StudentPathItem['status']): StudentPathItem {
  return {
    position,
    content_node_id: `n-${position}`,
    content_node_version_id: `v-${position}`,
    title: `Copied ${position}`,
    content_type: 'video',
    status,
  }
}

describe('courseStanding', () => {
  it('is none without an enrolment in this course', () => {
    expect(courseStanding([makeEnrollment({ course_id: 'other' })], 'c-1')).toEqual({ kind: 'none' })
  })

  it('prefers an active enrolment over a finished or left one of the same course', () => {
    const active = makeEnrollment({ course_enrollment_id: 'e-3' })
    const standing = courseStanding(
      [
        makeEnrollment({ course_enrollment_id: 'e-1', status: 'abandoned' }),
        makeEnrollment({ course_enrollment_id: 'e-2', status: 'completed' }),
        active,
      ],
      'c-1',
    )
    expect(standing).toEqual({ kind: 'enrolled', enrollment: active })
  })

  it('is finished over left', () => {
    const finished = makeEnrollment({ course_enrollment_id: 'e-2', status: 'completed' })
    expect(
      courseStanding([makeEnrollment({ course_enrollment_id: 'e-1', status: 'abandoned' }), finished], 'c-1'),
    ).toEqual({ kind: 'finished', enrollment: finished })
  })

  it('is left when every enrolment in the course was abandoned', () => {
    expect(courseStanding([makeEnrollment({ status: 'abandoned' })], 'c-1')).toEqual({ kind: 'left' })
  })
})

describe('buildCourseOutline', () => {
  it('marks the parts before the active one done, the active one current and the rest upcoming', () => {
    const outline = buildCourseOutline(course(), { kind: 'enrolled', enrollment: makeEnrollment() }, null)

    expect(outline.map((part) => [part.position, part.title, part.state, part.lessonCount])).toEqual([
      [1, 'Open chords', 'done', 12],
      [2, 'Major triads', 'current', 14],
      [3, 'Seventh chords', 'upcoming', 10],
      [4, 'Accompany a song', 'upcoming', 8],
    ])
  })

  it('counts and lists the current part from the active path when the course is the current one', () => {
    const items = [pathItem(1, 'completed'), pathItem(2, 'completed'), pathItem(3, 'in_progress'), pathItem(4, 'locked')]
    const outline = buildCourseOutline(
      course(),
      { kind: 'enrolled', enrollment: makeEnrollment() },
      makeCurrentPath({ items }),
    )
    const current = outline[1]

    expect(current?.lessonsDone).toBe(2)
    expect(current?.lessonCount).toBe(4)
    expect(current?.lessons).toEqual([
      { title: 'Copied 1', done: true },
      { title: 'Copied 2', done: true },
      { title: 'Copied 3', done: false },
      { title: 'Copied 4', done: false },
    ])
  })

  it('has no lesson count for the current part when another course is current', () => {
    const outline = buildCourseOutline(
      course(),
      { kind: 'enrolled', enrollment: makeEnrollment() },
      makeCurrentPath({ course_enrollment_id: 'e-other', items: [pathItem(1, 'completed')] }),
    )
    const current = outline[1]

    expect(current?.lessonsDone).toBeNull()
    expect(current?.lessonCount).toBe(14)
    expect(current?.lessons[0]).toEqual({ title: 'Triad 1' })
  })

  it('marks every part done for a finished course', () => {
    const outline = buildCourseOutline(
      course(),
      { kind: 'finished', enrollment: makeEnrollment({ status: 'completed' }) },
      null,
    )
    expect(outline.map((part) => part.state)).toEqual(['done', 'done', 'done', 'done'])
  })

  it.each(['none', 'left'] as const)('shows every part upcoming when the student is %s', (kind) => {
    const outline = buildCourseOutline(course(), { kind }, null)
    expect(outline.map((part) => part.state)).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming'])
  })
})

describe('foldCurrentLessons', () => {
  const lesson = (n: number, done: boolean) => ({ title: `Lesson ${n}`, done })

  it('shows two done lessons, folds the other done ones, then the next two and how many follow', () => {
    const lessons = Array.from({ length: 14 }, (_, index) => lesson(index + 1, index < 7))

    expect(foldCurrentLessons(lessons)).toEqual([
      { kind: 'lesson', title: 'Lesson 1', done: true },
      { kind: 'lesson', title: 'Lesson 2', done: true },
      { kind: 'more-done', count: 5 },
      { kind: 'lesson', title: 'Lesson 8', done: false },
      { kind: 'lesson', title: 'Lesson 9', done: false },
      { kind: 'more', count: 5 },
    ])
  })

  it('folds nothing when there is little to fold', () => {
    const lessons = [lesson(1, true), lesson(2, false), lesson(3, false)]

    expect(foldCurrentLessons(lessons)).toEqual([
      { kind: 'lesson', title: 'Lesson 1', done: true },
      { kind: 'lesson', title: 'Lesson 2', done: false },
      { kind: 'lesson', title: 'Lesson 3', done: false },
    ])
  })

  it('lists every title, unmarked, when which are done is unknown', () => {
    const lessons = [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }, { title: 'E' }]

    expect(foldCurrentLessons(lessons)).toEqual(lessons.map(({ title }) => ({ kind: 'lesson', title })))
  })
})
