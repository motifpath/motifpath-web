import type { components } from '@/api/generated/core-domain'

type Role = components['schemas']['UserProfile']['role']

export type NavLabelKey =
  | 'nav.student'
  | 'nav.practice'
  | 'nav.myCourses'
  | 'nav.findCourse'
  | 'nav.findPath'
  | 'nav.content'
  | 'nav.paths'
  | 'nav.courses'
  | 'nav.exercises'
  | 'nav.diagrams'
  | 'nav.knowledgeMap'

export interface NavSection {
  /** Route name the section links to. */
  name: string
  labelKey: NavLabelKey
}

/** The learner sections — every user can learn, whatever their role. */
export const STUDENT_SECTIONS: NavSection[] = [
  { name: 'path', labelKey: 'nav.student' },
  { name: 'practice-home', labelKey: 'nav.practice' },
  { name: 'my-courses', labelKey: 'nav.myCourses' },
  { name: 'course-catalog', labelKey: 'nav.findCourse' },
  { name: 'path-catalog', labelKey: 'nav.findPath' },
]

/** The authoring sections, for teachers and admins. */
export const TEACHER_SECTIONS: NavSection[] = [
  { name: 'teacher-content', labelKey: 'nav.content' },
  { name: 'teacher-paths', labelKey: 'nav.paths' },
  { name: 'teacher-courses', labelKey: 'nav.courses' },
  { name: 'teacher-exercises', labelKey: 'nav.exercises' },
  { name: 'teacher-diagrams', labelKey: 'nav.diagrams' },
]

/** The sections that change what everyone else authors against, for admins only. */
export const ADMIN_SECTIONS: NavSection[] = [{ name: 'admin-knowledge-map', labelKey: 'nav.knowledgeMap' }]

/** The authoring sections role can reach: the teacher ones, plus the admin ones for an admin. */
export function authoringSectionsFor(role: Role | undefined): NavSection[] {
  return role === 'admin' ? [...TEACHER_SECTIONS, ...ADMIN_SECTIONS] : TEACHER_SECTIONS
}

/** Every section role can reach, for navigation outside a section's own layout. */
export function sectionsFor(role: Role): NavSection[] {
  return role === 'student' ? STUDENT_SECTIONS : [...STUDENT_SECTIONS, ...authoringSectionsFor(role)]
}
