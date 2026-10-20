import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type UserProfile = components['schemas']['UserProfile']

/**
 * Whether `user` may save changes over `diagram` itself, rather than only
 * saving a copy. No one may update a chord voicing's diagram: only the chord
 * catalog changes it. Otherwise admins may update any diagram, and a teacher
 * only the custom diagrams they created — never a basic template, whoever
 * created it. Mirrors the server's own rule, so the editor never offers a
 * save the API would refuse.
 */
export function canEditDiagram(
  diagram: Pick<Diagram, 'kind' | 'purpose' | 'created_by'>,
  user: Pick<UserProfile, 'user_id' | 'role'> | null,
): boolean {
  if (!user) return false
  if (diagram.purpose === 'chord_voicing') return false
  if (user.role === 'admin') return true
  return user.role === 'teacher' && diagram.kind === 'custom' && diagram.created_by.user_id === user.user_id
}
