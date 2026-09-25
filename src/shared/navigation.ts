import type { components } from '@/api/generated/core-domain'

type Role = components['schemas']['UserProfile']['role']

export type NavLabelKey =
  | 'nav.student'
  | 'nav.myCourses'
  | 'nav.findCourse'
  | 'nav.content'
  | 'nav.paths'
  | 'nav.courses'
  | 'nav.exercises'
  | 'nav.diagrams'

export interface NavSection {
  /** Route name the section links to. */
  name: string
  labelKey: NavLabelKey
}

/** The learner sections — every user can learn, whatever their role. */
export const STUDENT_SECTIONS: NavSection[] = [
  { name: 'path', labelKey: 'nav.student' },
  { name: 'my-courses', labelKey: 'nav.myCourses' },
  { name: 'course-catalog', labelKey: 'nav.findCourse' },
]

/** The authoring sections, for teachers and admins. */
export const TEACHER_SECTIONS: NavSection[] = [
  { name: 'teacher-content', labelKey: 'nav.content' },
  { name: 'teacher-paths', labelKey: 'nav.paths' },
  { name: 'teacher-courses', labelKey: 'nav.courses' },
  { name: 'teacher-exercises', labelKey: 'nav.exercises' },
  { name: 'teacher-diagrams', labelKey: 'nav.diagrams' },
]

/** Every section role can reach, for navigation outside a section's own layout. */
export function sectionsFor(role: Role): NavSection[] {
  return role === 'student' ? STUDENT_SECTIONS : [...STUDENT_SECTIONS, ...TEACHER_SECTIONS]
}
