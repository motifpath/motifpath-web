import type { components } from '@/api/generated/core-domain'

type StudentPathItem = components['schemas']['StudentPathItem']
type StudentPathView = components['schemas']['StudentPathView']

/**
 * Builds a `StudentPathItem` for tests. Pass `sectionLabel` to set
 * `section_label`; omit it to leave the field absent (as the API does for
 * an unlabelled item). Pass `status` to override the default `not_started`.
 */
export function makeStudentPathItem(
  position: number,
  sectionLabel?: string,
  status: StudentPathItem['status'] = 'not_started',
): StudentPathItem {
  return {
    position,
    content_node_id: `node-${position}`,
    title: `Step ${position}`,
    content_type: 'video',
    status,
    ...(sectionLabel === undefined ? {} : { section_label: sectionLabel }),
  }
}

/**
 * Builds a `StudentPathView` for tests from a list of items. `current_position`
 * defaults to the first item that is not `completed` (mirroring the backend
 * rule), or one past the end when every item is completed.
 */
export function makeStudentPathView(
  items: StudentPathItem[],
  overrides: Partial<StudentPathView> = {},
): StudentPathView {
  const firstUndone = items.find((item) => item.status !== 'completed')

  return {
    assignment_id: '00000000-0000-0000-0000-000000000001',
    learning_path_id: '00000000-0000-0000-0000-000000000002',
    title: 'Blues Foundations',
    current_position: firstUndone ? firstUndone.position : items.length + 1,
    items,
    ...overrides,
  }
}
