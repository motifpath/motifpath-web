import type { components } from '@/api/generated/core-domain'

type Role = components['schemas']['UserProfile']['role']

export type NavLabelKey =
  | 'nav.student'
  | 'nav.myCourses'
  | 'nav.findCourse'
  | 'nav.content'
  | 'nav.paths'
  | 'nav.exercises'
  | 'nav.diagrams'

export interface NavSection {
  /** Route name the section links to. */
  name: string
  labelKey: NavLabelKey
  /** Only for someone who can take courses themselves (see canActAsStudent). */
  learnerOnly?: boolean
}

export const STUDENT_SECTIONS: NavSection[] = [
  { name: 'path', labelKey: 'nav.student' },
  { name: 'my-courses', labelKey: 'nav.myCourses', learnerOnly: true },
  { name: 'course-catalog', labelKey: 'nav.findCourse', learnerOnly: true },
]

export const TEACHER_SECTIONS: NavSection[] = [
  { name: 'teacher-content', labelKey: 'nav.content' },
  { name: 'teacher-paths', labelKey: 'nav.paths' },
  { name: 'teacher-exercises', labelKey: 'nav.exercises' },
  { name: 'teacher-diagrams', labelKey: 'nav.diagrams' },
]

/**
 * Whether role can enroll in courses and hold paths of its own: a student,
 * or an admin using their own account to try the learner side.
 */
export function canActAsStudent(role: Role | null | undefined): boolean {
  return role === 'student' || role === 'admin'
}

/** The student sections role may use — the course sections need a learner. */
export function studentSectionsFor(role: Role | null | undefined): NavSection[] {
  return STUDENT_SECTIONS.filter((section) => !section.learnerOnly || canActAsStudent(role))
}

/** Every section role can reach, for navigation outside a section's own layout. */
export function sectionsFor(role: Role): NavSection[] {
  if (role === 'student') return STUDENT_SECTIONS
  if (role === 'teacher') return TEACHER_SECTIONS
  return [...STUDENT_SECTIONS, ...TEACHER_SECTIONS]
}
