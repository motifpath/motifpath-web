import type { components } from '@/api/generated/core-domain'
import type { CatalogLevel } from '@/features/student/utils/discoverQuery'

type CourseCatalogEntry = components['schemas']['CourseCatalogEntry']
type PathCatalogEntry = components['schemas']['PathCatalogEntry']
type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']
type UserRef = components['schemas']['UserRef']

/** A course or a path as Discover lists it. */
export interface CatalogItem {
  kind: 'course' | 'path'
  id: string
  title: string
  level: CatalogLevel
  language: string
  createdBy: UserRef
  instrumentIds: string[]
  thumbnailUrl?: string
  /** A course's parts; a path has none. */
  partCount?: number
  lessonCount: number
}

export type CatalogBadge = 'in-learning' | 'finished'

/** What the student has started, which the catalog itself doesn't know. */
export interface StudentLearning {
  enrollments: CourseEnrollment[]
  paths: StudentPath[]
}

export function courseItem(entry: CourseCatalogEntry): CatalogItem {
  return {
    kind: 'course',
    id: entry.course_id,
    title: entry.title,
    level: entry.level,
    language: entry.language,
    createdBy: entry.created_by,
    instrumentIds: entry.instrument_ids,
    thumbnailUrl: entry.thumbnail_url,
    partCount: entry.checkpoint_count,
    lessonCount: entry.lesson_count,
  }
}

export function pathItem(entry: PathCatalogEntry): CatalogItem {
  return {
    kind: 'path',
    id: entry.learning_path_id,
    title: entry.title,
    level: entry.level,
    language: entry.language,
    createdBy: entry.created_by,
    instrumentIds: entry.instrument_ids,
    thumbnailUrl: entry.thumbnail_url,
    lessonCount: entry.lesson_count,
  }
}

/**
 * In Learning while the student has the item going; Finished once a course is completed or every
 * lesson of a path is. A left course and a path removed from Learning have no badge.
 */
export function catalogBadge(item: CatalogItem, learning: StudentLearning): CatalogBadge | null {
  if (item.kind === 'course') {
    const statuses = learning.enrollments.filter((e) => e.course_id === item.id).map((e) => e.status)
    if (statuses.includes('active')) return 'in-learning'
    return statuses.includes('completed') ? 'finished' : null
  }
  const copy = learning.paths.find((p) => !p.archived_at && p.source_template_id === item.id)
  if (!copy) return null
  return copy.lesson_count > 0 && copy.completed_count >= copy.lesson_count ? 'finished' : 'in-learning'
}
