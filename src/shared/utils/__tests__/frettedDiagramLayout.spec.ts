import { describe, expect, it } from 'vitest'

import { computeFrettedDiagramLayout } from '@/shared/utils/frettedDiagramLayout'
import {
  makeDiagramRef,
  makeFrettedDiagram,
  makeFrettedInstrument,
} from '@/shared/testUtils/diagram'

describe('computeFrettedDiagramLayout', () => {
  it('includes every diagram position when layers.subset is unset', () => {
    const diagram = makeFrettedDiagram()
    const instrument = makeFrettedInstrument()
    const diagramRef = makeDiagramRef()

    const layout = computeFrettedDiagramLayout(diagram, instrument, diagramRef)

    expect(layout.positions).toHaveLength(diagram.positions.length)
  })

  it('carries the diagram positions field-for-field, plus a derived isRoot flag', () => {
    const diagram = makeFrettedDiagram()
    const instrument = makeFrettedInstrument()
    const diagramRef = makeDiagramRef()

    const layout = computeFrettedDiagramLayout(diagram, instrument, diagramRef)

    const root = layout.positions.find((p) => p.positionId === 'p0')
    expect(root).toMatchObject({
      positionId: 'p0',
      string: 6,
      fret: 5,
      interval: 'R',
      noteName: 'A',
      shape: 'dot',
      isRoot: true,
    })
    const nonRoot = layout.positions.find((p) => p.positionId === 'p1')
    expect(nonRoot).toMatchObject({ isRoot: false })
  })

  it('carries the fretted instrument string_count through as stringCount', () => {
    const diagram = makeFrettedDiagram()
    const instrument = makeFrettedInstrument({ string_count: 4 })
    const diagramRef = makeDiagramRef()

    const layout = computeFrettedDiagramLayout(diagram, instrument, diagramRef)

    expect(layout.stringCount).toBe(4)
  })

  it('hides positions whose interval is not in layers.subset', () => {
    const diagram = makeFrettedDiagram()
    const instrument = makeFrettedInstrument()
    const diagramRef = makeDiagramRef({ layers: { intervals: true, subset: ['R'] } })

    const layout = computeFrettedDiagramLayout(diagram, instrument, diagramRef)

    expect(layout.positions).toHaveLength(2)
    expect(layout.positions.every((p) => p.interval === 'R')).toBe(true)
  })

  it('returns an empty position list when no position matches layers.subset', () => {
    const diagram = makeFrettedDiagram()
    const instrument = makeFrettedInstrument()
    const diagramRef = makeDiagramRef({ layers: { intervals: true, subset: ['6'] } })

    const layout = computeFrettedDiagramLayout(diagram, instrument, diagramRef)

    expect(layout.positions).toHaveLength(0)
    expect(layout.minFret).toBe(0)
    expect(layout.maxFret).toBe(3)
  })

  it('computes minFret/maxFret one fret beyond the visible range', () => {
    const diagram = makeFrettedDiagram()
    const instrument = makeFrettedInstrument()
    const diagramRef = makeDiagramRef()

    const layout = computeFrettedDiagramLayout(diagram, instrument, diagramRef)

    // visible frets span 5..8
    expect(layout.minFret).toBe(4)
    expect(layout.maxFret).toBe(9)
  })

  it('widens a narrow fret window to a minimum span of 3', () => {
    const diagram = makeFrettedDiagram({
      positions: [
        { position_id: 'p0', string: 6, fret: 5, interval: 'R', note_name: 'A', shape: 'dot' },
        { position_id: 'p1', string: 5, fret: 5, interval: '4', note_name: 'D', shape: 'star' },
      ],
    })
    const instrument = makeFrettedInstrument()
    const diagramRef = makeDiagramRef()

    const layout = computeFrettedDiagramLayout(diagram, instrument, diagramRef)

    expect(layout.maxFret - layout.minFret).toBe(3)
  })
})
