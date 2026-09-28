import { describe, expect, it } from 'vitest'

import { parseDiagramEmbed } from '@/shared/utils/diagramEmbed'

const ref = { diagram_id: 'd-1', layers: { intervals: true } }
const other = { diagram_id: 'd-2', layers: { intervals: false, subset: ['R'] } }

describe('parseDiagramEmbed', () => {
  it('reads a single diagram_ref', () => {
    expect(parseDiagramEmbed({ diagram_ref: ref })).toEqual({ kind: 'single', ref })
  })

  it('reads a diagram_stack_ref of two or more refs', () => {
    expect(parseDiagramEmbed({ diagram_stack_ref: { stack: [ref, other] } })).toEqual({
      kind: 'stack',
      stack: [ref, other],
    })
  })

  it('prefers diagram_ref when both are present', () => {
    expect(parseDiagramEmbed({ diagram_ref: ref, diagram_stack_ref: { stack: [ref, other] } })).toEqual({
      kind: 'single',
      ref,
    })
  })

  const malformed: [string, Record<string, unknown> | null | undefined][] = [
    ['nothing', undefined],
    ['null', null],
    ['no ref at all', {}],
    ['a ref without a diagram id', { diagram_ref: { layers: { intervals: true } } }],
    ['a ref with an empty diagram id', { diagram_ref: { diagram_id: '', layers: { intervals: true } } }],
    ['a ref without layers', { diagram_ref: { diagram_id: 'd-1' } }],
    ['a ref whose intervals flag is not a boolean', { diagram_ref: { diagram_id: 'd-1', layers: { intervals: 'yes' } } }],
    ['a ref that is not an object', { diagram_ref: 'd-1' }],
    ['a stack of one', { diagram_stack_ref: { stack: [ref] } }],
    ['a stack that is not an array', { diagram_stack_ref: { stack: ref } }],
    ['a stack with a malformed entry', { diagram_stack_ref: { stack: [ref, { diagram_id: 'd-2' }] } }],
  ]
  it.each(malformed)('returns null for %s', (_label, attrs) => {
    expect(parseDiagramEmbed(attrs)).toBeNull()
  })
})
