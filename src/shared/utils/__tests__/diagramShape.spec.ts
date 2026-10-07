import { describe, expect, it } from 'vitest'

import { cellsOfDegree, gradeDiagramShape } from '@/shared/utils/diagramShape'
import type { GradableShapeAnswer, ShapePosition, ShapeReference } from '@/shared/utils/diagramShape'
import golden from '@/api/generated/golden/practice-graders/diagram_shape.v1.json'

/** "C major — CAGED A, shift 3". */
const cagedA: ShapeReference = {
  shape: 'A',
  members: ['C', 'A', 'G', 'E', 'D'],
  stringCount: 6,
  positions: [
    { string: 5, fret: 3, interval: 'R' },
    { string: 4, fret: 5, interval: '5' },
    { string: 3, fret: 5, interval: 'R' },
    { string: 2, fret: 5, interval: '3' },
    { string: 1, fret: 3, interval: '5' },
  ],
}

describe('cellsOfDegree', () => {
  it('lists every position of the degree, in the diagram’s order', () => {
    expect(cellsOfDegree(cagedA.positions, '5')).toEqual([
      { string: 4, fret: 5 },
      { string: 1, fret: 3 },
    ])
  })

  it('is empty for a degree the shape doesn’t have', () => {
    expect(cellsOfDegree(cagedA.positions, 'b7')).toEqual([])
  })
})

describe('gradeDiagramShape', () => {
  it('is null for a fret below the open string', () => {
    expect(gradeDiagramShape(cagedA, { response_type: 'find_the_degree', interval: '3', string: 2, fret: -1 })).toBeNull()
  })
})

// The server grades the same answers; these shared cases keep the feedback a student sees in
// agreement with what's recorded. Rejections other than an unknown option, a degree the shape
// doesn't ask and an invalid cell are about the item or the response's shape, which a client
// never gets wrong for a shape it was given.
describe('gradeDiagramShape against the diagram_shape.v1 golden cases', () => {
  const instruments: Record<string, { tuning: string[] }> = golden.reference.instruments
  const families: Record<string, { members: string[] }> = golden.reference.shape_families
  const diagrams: Record<string, { layout_instrument_id: string; shape?: string; shape_family?: string; positions?: ShapePosition[] }> =
    golden.reference.diagrams

  const CLIENT_REJECTIONS = ['unknown_option', 'degree_not_in_shape', 'invalid_cell']

  function referenceOf(itemKey: string): ShapeReference | null {
    const diagram = diagrams[itemKey.split(':')[1] ?? '']
    if (!diagram?.shape || !diagram.shape_family || !diagram.positions) return null
    const members = families[diagram.shape_family]?.members
    const tuning = instruments[diagram.layout_instrument_id]?.tuning
    if (!members || !tuning) return null
    return { shape: diagram.shape, members, stringCount: tuning.length, positions: diagram.positions }
  }

  interface Case {
    name: string
    reference: ShapeReference
    answer: GradableShapeAnswer
    correct: boolean | null
  }

  const cases = golden.cases.flatMap(({ name, item_key, response, expected }): Case[] => {
    const reference = referenceOf(item_key)
    if (!reference) return []
    const answer: GradableShapeAnswer | null =
      response.response_type === 'name_the_shape' && response.shape !== undefined
        ? { response_type: 'name_the_shape', shape: response.shape }
        : response.response_type === 'find_the_degree' &&
            response.interval !== undefined &&
            response.string !== undefined &&
            response.fret !== undefined
          ? { response_type: 'find_the_degree', interval: response.interval, string: response.string, fret: response.fret }
          : null
    if (!answer) return []
    if ('evidence' in expected && expected.evidence) return [{ name, reference, answer, correct: expected.evidence.correct }]
    if ('reason' in expected && CLIENT_REJECTIONS.includes(expected.reason)) return [{ name, reference, answer, correct: null }]
    return []
  })

  it('has cases to run, of both drills', () => {
    expect(cases.some((c) => c.answer.response_type === 'name_the_shape')).toBe(true)
    expect(cases.some((c) => c.answer.response_type === 'find_the_degree')).toBe(true)
  })

  it.each(cases)('$name', ({ reference, answer, correct }) => {
    expect(gradeDiagramShape(reference, answer)).toBe(correct)
  })

  // A wrong tap reveals where the degree is: the cells the server's answer key names.
  const revealed = golden.cases.flatMap(({ name, item_key, expected }) => {
    const reference = referenceOf(item_key)
    if (!reference || !('evidence' in expected) || !expected.evidence || !('cells' in expected.evidence.answer_key)) return []
    const { interval, cells } = expected.evidence.answer_key
    return interval === undefined ? [] : [{ name, positions: reference.positions, interval, cells }]
  })

  it.each(revealed)('reveals the answer key’s cells: $name', ({ positions, interval, cells }) => {
    expect(cellsOfDegree(positions, interval)).toEqual(cells)
  })
})
