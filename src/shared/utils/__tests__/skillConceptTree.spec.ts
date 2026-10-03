import { describe, expect, it } from 'vitest'

import {
  ancestorIds,
  appliesSuggestions,
  descendantIds,
  filterIds,
  selectionSummary,
  suitsInstruments,
  toTreeNodes,
  treeRows,
} from '@/shared/utils/skillConceptTree'
import { knowledgeNode as fixture } from '@/shared/testUtils/knowledgeNode'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeEdge = components['schemas']['KnowledgeEdge']

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

function knowledgeNode(overrides: Partial<KnowledgeNode>): KnowledgeNode {
  return fixture('n-1', { key: 'bends', names: { en: 'Bends', pt_BR: 'Bends (puxadas)' }, ...overrides })
}

describe('toTreeNodes', () => {
  it('names each node in the given language and keeps its parent and instruments', () => {
    const [node] = toTreeNodes(
      [knowledgeNode({ node_id: 'n-2', parent_id: 'n-1', instrument_ids: ['electric-guitar'] })],
      'pt_BR',
    )
    expect(node).toEqual({
      id: 'n-2',
      name: 'Bends (puxadas)',
      parent_id: 'n-1',
      searchTerms: ['Bends (puxadas)', 'Bends', 'bends'],
      instrumentIds: ['electric-guitar'],
    })
  })

  it('falls back to English when the node has no name in the given language', () => {
    const [node] = toTreeNodes([knowledgeNode({ names: { en: 'Bends' } })], 'pt_BR')
    expect(node!.name).toBe('Bends')
  })

  it('makes the node findable by its name in every language and by its key', () => {
    const [node] = toTreeNodes(
      [knowledgeNode({ key: 'half-step-bend', names: { en: 'Half-step bend', pt_BR: 'Bend de meio tom' } })],
      'en',
    )
    expect(node!.searchTerms).toEqual(['Half-step bend', 'Bend de meio tom', 'half-step-bend'])
  })
})

describe('suitsInstruments', () => {
  const forEvery = { id: 'a', name: 'Reading tab', parent_id: null, instrumentIds: [] }
  const forElectric = { id: 'b', name: 'Bends', parent_id: null, instrumentIds: ['electric', 'acoustic'] }

  it('a node for every instrument suits any content', () => {
    expect(suitsInstruments(forEvery, ['bass'])).toBe(true)
    expect(suitsInstruments(forEvery, [])).toBe(true)
  })

  it('an instrument-specific node suits content for at least one of its instruments', () => {
    expect(suitsInstruments(forElectric, ['bass', 'electric'])).toBe(true)
  })

  it('an instrument-specific node does not suit content for none of its instruments', () => {
    expect(suitsInstruments(forElectric, ['bass'])).toBe(false)
  })

  it('an instrument-specific node does not suit content for every instrument', () => {
    expect(suitsInstruments(forElectric, [])).toBe(false)
  })
})

describe('appliesSuggestions', () => {
  const edges: KnowledgeEdge[] = [
    { edge_id: 'e-1', from_id: 'skill-1', to_id: 'concept-1', type: 'applies', level: null },
    { edge_id: 'e-2', from_id: 'skill-1', to_id: 'concept-2', type: 'applies', level: null },
    { edge_id: 'e-3', from_id: 'skill-2', to_id: 'concept-2', type: 'applies', level: null },
  ]

  it('suggests the concepts the picked skills apply, once each', () => {
    expect(appliesSuggestions(edges, ['skill-1', 'skill-2'], 'concepts')).toEqual(['concept-1', 'concept-2'])
  })

  it('suggests the skills that apply the picked concepts, once each', () => {
    expect(appliesSuggestions(edges, ['concept-2'], 'skills')).toEqual(['skill-1', 'skill-2'])
  })

  it('suggests nothing when nothing is picked', () => {
    expect(appliesSuggestions(edges, [], 'concepts')).toEqual([])
  })

  it('ignores requires edges', () => {
    const requires: KnowledgeEdge = { edge_id: 'e-4', from_id: 'skill-3', to_id: 'concept-3', type: 'requires', level: 'fluent' }
    expect(appliesSuggestions([requires], ['skill-3'], 'concepts')).toEqual([])
  })
})

describe('treeRows', () => {
  const tree = [
    { id: 'tech', name: 'Technique', parent_id: null },
    { id: 'bends', name: 'Bends', parent_id: 'tech' },
    { id: 'half', name: 'Half-step bend', parent_id: 'bends' },
    { id: 'alt', name: 'Alternate picking', parent_id: 'tech' },
    { id: 'rhythm', name: 'Rhythm', parent_id: null },
  ]
  const all = () => true
  const rowsOf = (rows: ReturnType<typeof treeRows>) => rows.map((r) => `${'  '.repeat(r.depth)}${r.node.name}`)

  it('lists the roots by name, with collapsed children hidden', () => {
    const rows = treeRows(tree, { include: all, match: null, expandedIds: new Set() })

    expect(rowsOf(rows)).toEqual(['Rhythm', 'Technique'])
    expect(rows.map((r) => [r.hasChildren, r.expanded])).toEqual([
      [false, false],
      [true, false],
    ])
  })

  it('shows the children of an expanded node, sorted by name, one level deeper', () => {
    const rows = treeRows(tree, { include: all, match: null, expandedIds: new Set(['tech']) })

    expect(rowsOf(rows)).toEqual(['Rhythm', 'Technique', '  Alternate picking', '  Bends'])
  })

  it('shows every match with its ancestors, all expanded, when matching', () => {
    const rows = treeRows(tree, { include: all, match: (n) => n.id === 'half', expandedIds: new Set() })

    expect(rowsOf(rows)).toEqual(['Technique', '  Bends', '    Half-step bend'])
    expect(rows.map((r) => r.matched)).toEqual([false, false, true])
  })

  it('leaves out excluded nodes, and lists a node whose parent is excluded as a root', () => {
    const rows = treeRows(tree, { include: (n) => n.id !== 'tech', match: null, expandedIds: new Set(['bends']) })

    expect(rowsOf(rows)).toEqual(['Alternate picking', 'Bends', '  Half-step bend', 'Rhythm'])
  })
})

describe('subtree selection', () => {
  const tree = [
    { id: 'tech', name: 'Technique', parent_id: null },
    { id: 'bends', name: 'Bends', parent_id: 'tech' },
    { id: 'half', name: 'Half-step bend', parent_id: 'bends' },
    { id: 'whole', name: 'Whole-step bend', parent_id: 'bends' },
    { id: 'alt', name: 'Alternate picking', parent_id: 'tech' },
  ]

  describe('filterIds', () => {
    it('drops a parent that was only picked because one of its children was', () => {
      expect(filterIds(tree, ['half', 'bends', 'tech'])).toEqual(['half'])
    })

    it('keeps a parent picked with its whole subtree, together with the subtree', () => {
      expect(filterIds(tree, ['bends', 'half', 'whole', 'tech'])).toEqual(['bends', 'half', 'whole'])
    })

    it('keeps a picked node that has no picked children', () => {
      expect(filterIds(tree, ['bends'])).toEqual(['bends'])
    })
  })

  describe('selectionSummary', () => {
    it('collapses a fully picked subtree into its top node, counting the rest', () => {
      expect(selectionSummary(tree, ['tech', 'bends', 'half', 'whole', 'alt'])).toEqual([{ id: 'tech', more: 4 }])
    })

    it('shows the picks under a partly picked parent, not the parent itself', () => {
      expect(selectionSummary(tree, ['tech', 'bends', 'half', 'whole'])).toEqual([{ id: 'bends', more: 2 }])
      expect(selectionSummary(tree, ['tech', 'bends', 'half'])).toEqual([{ id: 'half', more: 0 }])
    })

    it('shows a picked node with no picked children on its own', () => {
      expect(selectionSummary(tree, ['tech', 'bends'])).toEqual([{ id: 'bends', more: 0 }])
    })

    it('keeps the order the nodes were picked in', () => {
      expect(selectionSummary(tree, ['tech', 'alt', 'bends', 'half'])).toEqual([
        { id: 'alt', more: 0 },
        { id: 'half', more: 0 },
      ])
    })
  })
})
