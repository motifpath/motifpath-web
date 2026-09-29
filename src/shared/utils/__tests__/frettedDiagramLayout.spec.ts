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

  it('starts the window at the nut when a position is on an open string, since its marker sits on the nut', () => {
    const diagram = makeFrettedDiagram({
      positions: [
        { position_id: 'p0', string: 2, fret: 0, interval: '7', note_name: 'B', shape: 'dot' },
        { position_id: 'p1', string: 5, fret: 3, interval: 'R', note_name: 'C', shape: 'dot' },
      ],
      regions: [],
    })

    const layout = computeFrettedDiagramLayout(diagram, makeFrettedInstrument(), makeDiagramRef())

    expect(layout.minFret).toBe(0)
    expect(layout.maxFret).toBe(3)
  })

  it('spans the used fret spaces, from the fret wire before the lowest to the highest, with no empty space after', () => {
    const diagram = makeFrettedDiagram()
    const instrument = makeFrettedInstrument()
    const diagramRef = makeDiagramRef()

    const layout = computeFrettedDiagramLayout(diagram, instrument, diagramRef)

    // visible frets span 5..8
    expect(layout.minFret).toBe(4)
    expect(layout.maxFret).toBe(8)
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
    expect(layout.maxFret).toBe(12)
  })

  it('widens the fret window to cover extra frets, such as answer cells', () => {
    const layout = computeFrettedDiagramLayout(makeFrettedDiagram(), makeFrettedInstrument(), makeDiagramRef(), {
      extraFrets: [10],
    })

    expect(layout.minFret).toBe(4)
    expect(layout.maxFret).toBe(10)
  })

  it('shows an empty diagram as three fret spaces from the nut', () => {
    const layout = computeFrettedDiagramLayout(
      makeFrettedDiagram({ positions: [], regions: [] }),
      makeFrettedInstrument(),
      makeDiagramRef(),
    )

    expect(layout.minFret).toBe(0)
    expect(layout.maxFret).toBe(3)
  })

  it('has no regions when the diagram has none', () => {
    const layout = computeFrettedDiagramLayout(makeFrettedDiagram(), makeFrettedInstrument(), makeDiagramRef())

    expect(layout.regions).toEqual([])
  })

  describe('hidden positions', () => {
    it('leaves hidden positions out of the drawn ones, listing them apart', () => {
      const diagram = makeFrettedDiagram()
      const layout = computeFrettedDiagramLayout(
        diagram,
        makeFrettedInstrument(),
        makeDiagramRef({ layers: { label: 'interval', hidden_position_ids: ['p0', 'p3'] } }),
      )

      expect(layout.positions.map((p) => p.positionId)).toEqual(['p1', 'p2', 'p4', 'p5'])
      expect(layout.hiddenPositions.map((p) => p.positionId)).toEqual(['p0', 'p3'])
    })

    const spread = makeFrettedDiagram({
      positions: [
        { position_id: 'low', string: 6, fret: 5, interval: 'R', note_name: 'A', shape: 'dot' },
        { position_id: 'high', string: 1, fret: 12, interval: '5', note_name: 'E', shape: 'dot' },
      ],
    })

    it('fits the fret window to the drawn positions, so hiding some of a diagram zooms in on the rest', () => {
      const layout = computeFrettedDiagramLayout(
        spread,
        makeFrettedInstrument(),
        makeDiagramRef({ layers: { intervals: true, hidden_position_ids: ['low'] } }),
      )

      expect(layout.minFret).toBe(11)
      expect(layout.maxFret).toBe(14)
    })

    it('fits the window to every position, hidden or filtered, when asked, so a hidden answer stays in view', () => {
      const layout = computeFrettedDiagramLayout(
        spread,
        makeFrettedInstrument(),
        makeDiagramRef({ layers: { intervals: true, subset: ['R'], hidden_position_ids: ['low'] } }),
        { includeHidden: true },
      )

      expect(layout.positions).toEqual([])
      expect(layout.minFret).toBe(4)
      expect(layout.maxFret).toBe(12)
    })
  })
})
