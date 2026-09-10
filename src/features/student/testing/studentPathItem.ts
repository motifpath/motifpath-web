import type { components } from '@/api/generated/core-domain'

type StudentPathItem = components['schemas']['StudentPathItem']

/**
 * Builds a `StudentPathItem` for tests. Pass `sectionLabel` to set
 * `section_label`; omit it to leave the field absent (as the API does for
 * an unlabelled item).
 */
export function makeStudentPathItem(position: number, sectionLabel?: string): StudentPathItem {
  return {
    position,
    content_node_id: `node-${position}`,
    title: `Step ${position}`,
    content_type: 'video',
    status: 'not_started',
    ...(sectionLabel === undefined ? {} : { section_label: sectionLabel }),
  }
}
