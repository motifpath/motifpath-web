import { describe, expect, it } from 'vitest'

import { ancestorIds, descendantIds, mostSpecificIds } from '@/shared/utils/skillConceptTree'

const nodes = [
  { id: 'root-1', name: 'chord-theory', parent_id: null },
  { id: 'child-1', name: 'major-triads', parent_id: 'root-1' },
  { id: 'grandchild-1', name: 'drop-2', parent_id: 'child-1' },
  { id: 'root-2', name: 'rhythm', parent_id: null },
]

describe('ancestorIds', () => {
  it('returns every ancestor, nearest parent first', () => {
    const grandchild = nodes.find((n) => n.id === 'grandchild-1')!
    expect(ancestorIds(nodes, grandchild)).toEqual(['child-1', 'root-1'])
  })

  it('returns an empty array for a root node', () => {
    const root = nodes.find((n) => n.id === 'root-1')!
    expect(ancestorIds(nodes, root)).toEqual([])
  })

  it('stops at a dangling parent_id that has no matching node', () => {
    const orphan = { id: 'orphan-1', name: 'orphan', parent_id: 'missing' }
    expect(ancestorIds(nodes, orphan)).toEqual([])
  })
})

describe('descendantIds', () => {
  it('returns every transitive descendant', () => {
    expect(descendantIds(nodes, 'root-1')).toEqual(['child-1', 'grandchild-1'])
  })

  it('returns an empty array for a leaf node', () => {
    expect(descendantIds(nodes, 'grandchild-1')).toEqual([])
  })
})

describe('mostSpecificIds', () => {
  it('drops a selected id that is an ancestor of another selected id', () => {
    expect(mostSpecificIds(nodes, ['root-1', 'child-1', 'grandchild-1'])).toEqual(['grandchild-1'])
  })

  it('keeps unrelated selections side by side', () => {
    expect(mostSpecificIds(nodes, ['root-1', 'child-1', 'root-2'])).toEqual(['child-1', 'root-2'])
  })

  it('keeps an id whose node is unknown', () => {
    expect(mostSpecificIds(nodes, ['missing'])).toEqual(['missing'])
  })
})
