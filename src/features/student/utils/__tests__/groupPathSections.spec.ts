import { describe, expect, it } from 'vitest'

import { groupPathSections } from '@/features/student/utils/groupPathSections'
import { makeStudentPathItem as item } from '@/features/student/testing/studentPathItem'

describe('groupPathSections', () => {
  it('returns no groups for an empty path', () => {
    expect(groupPathSections([])).toEqual([])
  })

  it('puts every item in its own unlabelled group when no item has a section label', () => {
    const items = [item(1), item(2), item(3)]

    const groups = groupPathSections(items)

    expect(groups).toEqual([
      { label: null, items: [items[0]] },
      { label: null, items: [items[1]] },
      { label: null, items: [items[2]] },
    ])
  })

  it('collapses a run of consecutive items that share a label into one group', () => {
    const items = [item(1, 'Open chords'), item(2, 'Open chords'), item(3, 'Open chords')]

    const groups = groupPathSections(items)

    expect(groups).toHaveLength(1)
    expect(groups[0]).toEqual({ label: 'Open chords', items })
  })

  it('starts a new group when the label changes', () => {
    const items = [
      item(1, 'Open chords'),
      item(2, 'Open chords'),
      item(3, 'Strumming patterns'),
    ]

    const groups = groupPathSections(items)

    expect(groups).toEqual([
      { label: 'Open chords', items: [items[0], items[1]] },
      { label: 'Strumming patterns', items: [items[2]] },
    ])
  })

  it('does not merge a label reused after a gap', () => {
    const items = [item(1, 'Open chords'), item(2), item(3, 'Open chords')]

    const groups = groupPathSections(items)

    expect(groups).toEqual([
      { label: 'Open chords', items: [items[0]] },
      { label: null, items: [items[1]] },
      { label: 'Open chords', items: [items[2]] },
    ])
  })

  it('keeps a single labelled item as its own labelled group', () => {
    const items = [item(1), item(2, 'Bar chords'), item(3)]

    const groups = groupPathSections(items)

    expect(groups).toEqual([
      { label: null, items: [items[0]] },
      { label: 'Bar chords', items: [items[1]] },
      { label: null, items: [items[2]] },
    ])
  })

  it('treats an empty-string label as no label', () => {
    const groups = groupPathSections([item(1, '')])

    expect(groups).toEqual([{ label: null, items: [item(1, '')] }])
  })

  it('treats a whitespace-only label as no label', () => {
    const groups = groupPathSections([item(1, '   ')])

    expect(groups).toEqual([{ label: null, items: [item(1, '   ')] }])
  })

  it('trims surrounding whitespace and groups labels that differ only by it', () => {
    const items = [item(1, 'Open chords '), item(2, ' Open chords')]

    const groups = groupPathSections(items)

    expect(groups).toEqual([{ label: 'Open chords', items }])
  })
})
