import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { catalogBadge, courseItem, pathItem } from '@/features/student/utils/catalogItem'

type CourseCatalogEntry = components['schemas']['CourseCatalogEntry']
type PathCatalogEntry = components['schemas']['PathCatalogEntry']
type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']

const BRUNO = { user_id: 'u-bruno', display_name: 'Bruno' }

function course(overrides: Partial<CourseCatalogEntry> = {}): CourseCatalogEntry {
  return {
    course_id: 'c-blues',
    title: 'Blues basics',
    summary: 'Twelve bars',
    level: 'beginner',
    language: 'en',
    created_by: BRUNO,
    status: 'published',
    published_at: '2026-10-01T00:00:00Z',
    has_unpublished_changes: false,
    updated_at: '2026-10-01T00:00:00Z',
    instrument_ids: ['i-guitar'],
    checkpoint_count: 4,
    lesson_count: 44,
    ...overrides,
  }
}

function path(overrides: Partial<PathCatalogEntry> = {}): PathCatalogEntry {
  return {
    learning_path_id: 'lp-open',
    title: 'Open chords',
    summary: 'First shapes',
    level: 'beginner',
    language: 'en',
    created_by: BRUNO,
    instrument_ids: ['i-guitar'],
    lesson_count: 9,
    ...overrides,
  }
}

function enrollment(status: CourseEnrollment['status'], courseId = 'c-blues'): CourseEnrollment {
  return { course_id: courseId, status } as CourseEnrollment
}

function held(overrides: Partial<StudentPath> = {}): StudentPath {
  return { source_template_id: 'lp-open', archived_at: null, lesson_count: 9, completed_count: 0, ...overrides } as StudentPath
}

describe('courseItem and pathItem', () => {
  it('describes a course by its parts and lessons', () => {
    expect(courseItem(course())).toMatchObject({
      kind: 'course',
      id: 'c-blues',
      title: 'Blues basics',
      level: 'beginner',
      language: 'en',
      createdBy: BRUNO,
      instrumentIds: ['i-guitar'],
      partCount: 4,
      lessonCount: 44,
    })
  })

  it('describes a path by its lessons only', () => {
    const item = pathItem(path())
    expect(item).toMatchObject({ kind: 'path', id: 'lp-open', lessonCount: 9 })
    expect(item.partCount).toBeUndefined()
  })
})

describe('catalogBadge', () => {
  const learning = { enrollments: [] as CourseEnrollment[], paths: [] as StudentPath[] }

  it('marks a course with an active enrollment In Learning', () => {
    expect(catalogBadge(courseItem(course()), { ...learning, enrollments: [enrollment('active')] })).toBe('in-learning')
  })

  it('marks a finished course Finished', () => {
    expect(catalogBadge(courseItem(course()), { ...learning, enrollments: [enrollment('completed')] })).toBe('finished')
  })

  it('prefers In Learning when a finished course was started again', () => {
    const enrollments = [enrollment('completed'), enrollment('active')]
    expect(catalogBadge(courseItem(course()), { ...learning, enrollments })).toBe('in-learning')
  })

  it('gives a left course no badge', () => {
    expect(catalogBadge(courseItem(course()), { ...learning, enrollments: [enrollment('abandoned')] })).toBeNull()
  })

  it('ignores enrollments in other courses', () => {
    expect(catalogBadge(courseItem(course()), { ...learning, enrollments: [enrollment('active', 'c-other')] })).toBeNull()
  })

  it('marks a held path In Learning', () => {
    expect(catalogBadge(pathItem(path()), { ...learning, paths: [held({ completed_count: 5 })] })).toBe('in-learning')
  })

  it('marks a held path with every lesson completed Finished', () => {
    expect(catalogBadge(pathItem(path()), { ...learning, paths: [held({ completed_count: 9 })] })).toBe('finished')
  })

  it('gives a path removed from Learning no badge', () => {
    expect(catalogBadge(pathItem(path()), { ...learning, paths: [held({ archived_at: '2026-10-01T00:00:00Z' })] })).toBeNull()
  })
})
