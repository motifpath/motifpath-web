import { describe, expect, it } from 'vitest'

import { parseDiagramEmbed } from '@/shared/utils/diagramEmbed'

const ref = { diagram_id: 'd-1', layers: { intervals: true } }
const other = { diagram_id: 'd-2', layers: { intervals: false, subset: ['R'] } }

describe('parseDiagramEmbed', () => {
  it('reads a single diagram_ref', () => {
    expect(parseDiagramEmbed(ref, undefined)).toEqual({ kind: 'single', ref })
  })

  it('reads a diagram_stack_ref of two or more refs', () => {
    expect(parseDiagramEmbed(undefined, { stack: [ref, other] })).toEqual({
      kind: 'stack',
      stack: [ref, other],
    })
  })

  it('accepts a null subset', () => {
    const allShown = { diagram_id: 'd-1', layers: { intervals: true, subset: null } }
    expect(parseDiagramEmbed(allShown, null)).toEqual({ kind: 'single', ref: allShown })
  })

  it('prefers diagram_ref when both are present', () => {
    expect(parseDiagramEmbed(ref, { stack: [ref, other] })).toEqual({
      kind: 'single',
      ref,
    })
  })

  const malformed: [string, unknown, unknown][] = [
    ['nothing', undefined, undefined],
    ['nulls', null, null],
    ['a ref without a diagram id', { layers: { intervals: true } }, undefined],
    ['a ref with an empty diagram id', { diagram_id: '', layers: { intervals: true } }, undefined],
    ['a ref without layers', { diagram_id: 'd-1' }, undefined],
    ['a ref whose intervals flag is not a boolean', { diagram_id: 'd-1', layers: { intervals: 'yes' } }, undefined],
    ['a ref that is not an object', 'd-1', undefined],
    ['a ref whose subset is not a list', { diagram_id: 'd-1', layers: { intervals: true, subset: 5 } }, undefined],
    ['a ref whose subset holds a non-interval', { diagram_id: 'd-1', layers: { intervals: true, subset: ['R', 3] } }, undefined],
    ['a malformed ref beside a valid stack', { diagram_id: '' }, { stack: [ref, other] }],
    ['a stack of one', undefined, { stack: [ref] }],
    ['a stack that is not an array', undefined, { stack: ref }],
    ['a stack with a malformed entry', undefined, { stack: [ref, { diagram_id: 'd-2' }] }],
  ]
  it.each(malformed)('returns null for %s', (_label, diagramRef, diagramStackRef) => {
    expect(parseDiagramEmbed(diagramRef, diagramStackRef)).toBeNull()
  })
})
