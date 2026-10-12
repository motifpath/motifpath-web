import { Compass, Dumbbell, FileText, Grid3x3, Guitar, House, Library, Music, Network, Route } from 'lucide-vue-next'
import type { FunctionalComponent } from 'vue'

export type DestinationId = 'home' | 'practice' | 'myPath' | 'learning' | 'discover'

export interface Destination {
  id: DestinationId
  /** Where tapping the destination lands. */
  to: { name: string }
  labelKey: `nav.${DestinationId}`
  icon: FunctionalComponent
}

/**
 * The learner's five places, in the one order every size class shows them. A new place is reached
 * from one of these, never added as a sixth.
 */
export const LEARNER_DESTINATIONS: Destination[] = [
  { id: 'home', to: { name: 'home' }, labelKey: 'nav.home', icon: House },
  // Straight into the session setup: no page in between.
  { id: 'practice', to: { name: 'practice-session' }, labelKey: 'nav.practice', icon: Guitar },
  { id: 'myPath', to: { name: 'path' }, labelKey: 'nav.myPath', icon: Route },
  { id: 'learning', to: { name: 'my-courses' }, labelKey: 'nav.learning', icon: Library },
  { id: 'discover', to: { name: 'course-catalog' }, labelKey: 'nav.discover', icon: Compass },
]

// The destination each learner route sits under: Your progress belongs to the home, a lesson and a node's practice belong to My path,
// a finished course and a course opened from there to Learning, and a catalog's detail page to Discover.
const DESTINATION_OF_ROUTE: Record<string, DestinationId> = {
  home: 'home',
  'your-progress': 'home',
  'practice-session': 'practice',
  path: 'myPath',
  node: 'myPath',
  practice: 'myPath',
  'my-courses': 'learning',
  'course-completed': 'learning',
  'learning-course': 'learning',
  'course-catalog': 'discover',
  'course-detail': 'discover',
  'path-catalog': 'discover',
  'path-detail': 'discover',
}

/** The destination a route sits under, or null for a page outside all five (e.g. credits). */
export function destinationOf(routeName: string | undefined): DestinationId | null {
  return (routeName && DESTINATION_OF_ROUTE[routeName]) || null
}

export type NavLabelKey =
  | 'nav.content'
  | 'nav.paths'
  | 'nav.courses'
  | 'nav.exercises'
  | 'nav.diagrams'
  | 'nav.knowledgeMap'
  | 'nav.songCharts'

export interface NavSection {
  /** Route name the section links to. */
  name: string
  labelKey: NavLabelKey
  icon: FunctionalComponent
}

/** The authoring sections, for teachers and admins, in the order things are composed: a course of
 *  paths, a path of lessons, a lesson with exercises and diagrams. */
export const TEACHER_SECTIONS: NavSection[] = [
  { name: 'teacher-courses', labelKey: 'nav.courses', icon: Library },
  { name: 'teacher-paths', labelKey: 'nav.paths', icon: Route },
  { name: 'teacher-content', labelKey: 'nav.content', icon: FileText },
  { name: 'teacher-exercises', labelKey: 'nav.exercises', icon: Dumbbell },
  { name: 'teacher-diagrams', labelKey: 'nav.diagrams', icon: Grid3x3 },
]

/** The sections that change what everyone else authors against, for admins only. */
export const ADMIN_SECTIONS: NavSection[] = [
  { name: 'admin-knowledge-map', labelKey: 'nav.knowledgeMap', icon: Network },
  { name: 'admin-song-charts', labelKey: 'nav.songCharts', icon: Music },
]
