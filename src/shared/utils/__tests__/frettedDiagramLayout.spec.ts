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

  it("resolves each position's persisted color: its own, else the diagram's, else null", () => {
    const base = makeFrettedDiagram()
    const diagram = makeFrettedDiagram({
      color: '#3B82F6',
      positions: base.positions.map((p, i) => (i === 0 ? { ...p, color: '#EF4444' } : p)),
    })

    const colored = computeFrettedDiagramLayout(diagram, makeFrettedInstrument(), makeDiagramRef())

    expect(colored.positions[0]?.color).toBe('#EF4444')
    expect(colored.positions[1]?.color).toBe('#3B82F6')

    const plain = computeFrettedDiagramLayout(makeFrettedDiagram(), makeFrettedInstrument(), makeDiagramRef())
    expect(plain.positions.every((p) => p.color === null)).toBe(true)
  })

  it("carries each position's custom label and note, null when it has none", () => {
    const base = makeFrettedDiagram()
    const diagram = makeFrettedDiagram({
      positions: base.positions.map((p, i) =>
        i === 1 ? { ...p, custom_label: { en: 'Av', pt_BR: 'Ev' }, note: { en: 'Avoid it', pt_BR: 'Evite' } } : p,
      ),
    })

    const layout = computeFrettedDiagramLayout(diagram, makeFrettedInstrument(), makeDiagramRef())

    expect(layout.positions[1]).toMatchObject({
      customLabel: { en: 'Av', pt_BR: 'Ev' },
      note: { en: 'Avoid it', pt_BR: 'Evite' },
    })
    expect(layout.positions[0]).toMatchObject({ customLabel: null, note: null })
  })

  it('resolves regions in drawing order, a band without string bounds covering every string', () => {
    const diagram = makeFrettedDiagram({
      regions: [
        { region_id: 'r1', fret_start: 5, fret_end: 8, description: { en: 'Box 1' }, color: null },
        {
          region_id: 'r2',
          fret_start: 7,
          fret_end: 8,
          string_start: 1,
          string_end: 3,
          description: { en: 'Box 2' },
          color: '#22C55E',
        },
      ],
    })

    const layout = computeFrettedDiagramLayout(diagram, makeFrettedInstrument(), makeDiagramRef())

    expect(layout.regions).toEqual([
      { regionId: 'r1', fretStart: 5, fretEnd: 8, stringStart: 1, stringEnd: 6, description: { en: 'Box 1' }, color: null },
      { regionId: 'r2', fretStart: 7, fretEnd: 8, stringStart: 1, stringEnd: 3, description: { en: 'Box 2' }, color: '#22C55E' },
    ])
  })

  it('widens the fret window to cover every region, not just the positions', () => {
    const diagram = makeFrettedDiagram({
      regions: [{ region_id: 'r1', fret_start: 3, fret_end: 12, description: { en: 'Wide' }, color: null }],
    })

    const layout = computeFrettedDiagramLayout(diagram, makeFrettedInstrument(), makeDiagramRef())

    // positions span 5..8; the region spans 3..12
    expect(layout.minFret).toBe(2)
    expect(layout.maxFret).toBe(13)
  })

  it('has no regions when the diagram has none', () => {
    const layout = computeFrettedDiagramLayout(makeFrettedDiagram(), makeFrettedInstrument(), makeDiagramRef())

    expect(layout.regions).toEqual([])
  })
})
