import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type UserProfile = components['schemas']['UserProfile']

/**
 * Whether `user` may save changes over `diagram` itself, rather than only
 * saving a copy. Admins may update any diagram. A teacher may update only
 * the custom diagrams they created — never a basic template, whoever
 * created it. Mirrors the server's own rule, so the editor never offers a
 * save the API would refuse.
 */
export function canEditDiagram(
  diagram: Pick<Diagram, 'kind' | 'created_by'>,
  user: Pick<UserProfile, 'user_id' | 'role'> | null,
): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.role === 'teacher' && diagram.kind === 'custom' && diagram.created_by === user.user_id
}
