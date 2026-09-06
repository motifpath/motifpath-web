import type { components } from '@/api/generated/core-domain'

type StudentPathItem = components['schemas']['StudentPathItem']

/**
 * A run of consecutive path items rendered together. `label` is the shared
 * section label for a labelled run, or `null` for an item that carries no
 * section label (rendered ungrouped).
 */
export interface PathSection {
  label: string | null
  items: StudentPathItem[]
}

/**
 * Partitions a flat, ordered list of student path items into sections by
 * collapsing consecutive items that share the same non-empty `section_label`.
 *
 * An item with no label (or an empty one) is always its own `label: null`
 * section — unlabelled items never merge, and a label reused after a gap
 * starts a fresh section rather than joining the earlier one.
 */
export function groupPathSections(items: StudentPathItem[]): PathSection[] {
  const sections: PathSection[] = []

  for (const item of items) {
    const label = item.section_label ? item.section_label : null
    const current = sections[sections.length - 1]

    if (label !== null && current !== undefined && current.label === label) {
      current.items.push(item)
    } else {
      sections.push({ label, items: [item] })
    }
  }

  return sections
}
