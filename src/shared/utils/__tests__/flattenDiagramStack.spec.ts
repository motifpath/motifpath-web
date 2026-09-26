import { describe, expect, it } from 'vitest'

import {
  flattenDiagramStack,
  stackLayerFromDiagram,
  type StackLayer,
} from '@/shared/utils/flattenDiagramStack'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type DiagramPosition = components['schemas']['DiagramPosition']
type DiagramRegion = components['schemas']['DiagramRegion']

function position(overrides: Partial<DiagramPosition> = {}): DiagramPosition {
  return {
    position_id: crypto.randomUUID(),
    interval: 'R',
    note_name: 'A',
    shape: 'dot',
    sequence_index: 0,
    string: 6,
    fret: 5,
    ...overrides,
  }
}

function layer(overrides: Partial<StackLayer> = {}): StackLayer {
  return {
    names: { en: 'Layer', 'pt_BR': 'Camada' },
    color: null,
    positions: [],
    regions: [],
    skillIds: [],
    conceptIds: [],
    ...overrides,
  }
}

const bothLanguages = { languages: ['en', 'pt_BR'], regionPerLayer: false }

describe('flattenDiagramStack', () => {
  it('keeps a lone base layer as it is, without its position ids', () => {
    const base = layer({
      positions: [
        position({ interval: 'R', note_name: 'A', string: 6, fret: 5, sequence_index: 0 }),
        position({ interval: 'b3', note_name: 'C', string: 6, fret: 8, sequence_index: 1, shape: 'star' }),
      ],
    })

    const result = flattenDiagramStack([base], bothLanguages)

    expect(result.positions).toEqual([
      { interval: 'R', note_name: 'A', shape: 'dot', sequence_index: 0, string: 6, fret: 5 },
      { interval: 'b3', note_name: 'C', shape: 'star', sequence_index: 1, string: 6, fret: 8 },
    ])
    expect(result.positions.every((p) => p.position_id === undefined)).toBe(true)
  })

  it('stacks overlays after the base in the order they were added, each in its own sequence order', () => {
    const base = layer({ positions: [position({ note_name: 'C', fret: 8, sequence_index: 0 })] })
    const first = layer({
      positions: [
        position({ note_name: 'E', string: 5, fret: 7, sequence_index: 1 }),
        position({ note_name: 'D', string: 5, fret: 5, sequence_index: 0 }),
      ],
    })
    const second = layer({ positions: [position({ note_name: 'G', string: 4, fret: 5, sequence_index: 0 })] })

    const result = flattenDiagramStack([base, first, second], bothLanguages)

    expect(result.positions.map((p) => p.note_name)).toEqual(['C', 'D', 'E', 'G'])
    expect(result.positions.map((p) => p.sequence_index)).toEqual([0, 1, 2, 3])
  })

  it('keeps each position’s own interval and note name rather than recomputing them', () => {
    const base = layer({ positions: [position({ interval: '3', note_name: 'A', fret: 5 })] })
    const overlay = layer({ positions: [position({ interval: 'R', note_name: 'A', string: 3, fret: 2 })] })

    const result = flattenDiagramStack([base, overlay], bothLanguages)

    expect(result.positions.map((p) => p.interval)).toEqual(['3', 'R'])
  })

  it('keeps only the top layer’s position where two layers mark the same fret', () => {
    const base = layer({
      positions: [
        position({ interval: '5', string: 6, fret: 5 }),
        position({ interval: 'R', string: 5, fret: 7 }),
      ],
    })
    const overlay = layer({ positions: [position({ interval: 'b3', string: 6, fret: 5 })] })

    const result = flattenDiagramStack([base, overlay], bothLanguages)

    expect(result.positions.map((p) => [p.string, p.fret, p.interval])).toEqual([
      [5, 7, 'R'],
      [6, 5, 'b3'],
    ])
  })

  it('keeps only the top layer’s position where two layers mark the same key', () => {
    const base = layer({ positions: [position({ string: undefined, fret: undefined, key: 'C4', interval: 'R' })] })
    const overlay = layer({ positions: [position({ string: undefined, fret: undefined, key: 'C4', interval: '5' })] })

    const result = flattenDiagramStack([base, overlay], bothLanguages)

    expect(result.positions).toHaveLength(1)
    expect(result.positions[0]?.interval).toBe('5')
  })

  it('resolves each position’s colour from its own, then its layer’s, then none', () => {
    const base = layer({
      color: '#3B82F6',
      positions: [position({ fret: 1, color: '#EF4444' }), position({ fret: 2 })],
    })
    const overlay = layer({ color: null, positions: [position({ fret: 3 })] })

    const result = flattenDiagramStack([base, overlay], bothLanguages)

    expect(result.positions.map((p) => p.color ?? null)).toEqual(['#EF4444', '#3B82F6', null])
  })

  it('keeps custom labels and notes only in the given languages', () => {
    const overlay = layer({
      positions: [
        position({
          custom_label: { en: 'Hi', es: 'Ho' },
          note: { en: 'Target note', 'pt_BR': 'Nota alvo', es: 'Nota' },
        }),
      ],
    })

    const [flattened] = flattenDiagramStack([layer(), overlay], bothLanguages).positions

    expect(flattened?.custom_label).toEqual({ en: 'Hi' })
    expect(flattened?.note).toEqual({ en: 'Target note', 'pt_BR': 'Nota alvo' })
  })

  it('leaves out custom labels and notes that have no text in the given languages', () => {
    const overlay = layer({ positions: [position({ custom_label: { es: 'Ho' }, note: { en: '  ' } })] })

    const [flattened] = flattenDiagramStack([layer(), overlay], bothLanguages).positions

    expect(flattened).not.toHaveProperty('custom_label')
    expect(flattened).not.toHaveProperty('note')
  })

  it('carries every layer’s regions over unchanged in layer order, without ids and in the given languages', () => {
    const baseRegion: DiagramRegion = {
      region_id: crypto.randomUUID(),
      fret_start: 5,
      fret_end: 8,
      description: { en: 'Shape 1', 'pt_BR': 'Forma 1' },
      color: null,
    }
    const overlayRegion: DiagramRegion = {
      region_id: crypto.randomUUID(),
      fret_start: 7,
      fret_end: 10,
      string_start: 1,
      string_end: 3,
      description: { en: 'Shape 2', es: 'Forma 2' },
      color: '#22C55E',
    }

    const result = flattenDiagramStack(
      [layer({ regions: [baseRegion] }), layer({ regions: [overlayRegion] })],
      bothLanguages,
    )

    expect(result.regions).toEqual([
      { fret_start: 5, fret_end: 8, description: { en: 'Shape 1', 'pt_BR': 'Forma 1' }, color: null },
      {
        fret_start: 7,
        fret_end: 10,
        string_start: 1,
        string_end: 3,
        description: { en: 'Shape 2' },
        color: '#22C55E',
      },
    ])
  })

  it('adds no generated regions unless asked to', () => {
    const result = flattenDiagramStack([layer({ positions: [position()] })], bothLanguages)

    expect(result.regions).toEqual([])
  })

  it('adds one region per layer spanning its frets, named and coloured after the layer, before the carried regions', () => {
    const carried: DiagramRegion = { fret_start: 0, fret_end: 1, description: { en: 'Open' }, color: null }
    const base = layer({
      names: { en: 'C major', 'pt_BR': 'Dó maior', es: 'Do mayor' },
      color: '#3B82F6',
      positions: [position({ fret: 8 }), position({ string: 5, fret: 5 }), position({ string: 1, fret: 7 })],
      regions: [carried],
    })
    const overlay = layer({
      names: { en: 'A minor pentatonic' },
      color: null,
      positions: [position({ fret: 12 }), position({ string: 2, fret: 10 })],
    })

    const result = flattenDiagramStack([base, overlay], { languages: ['en', 'pt_BR'], regionPerLayer: true })

    expect(result.regions).toEqual([
      { fret_start: 5, fret_end: 8, description: { en: 'C major', 'pt_BR': 'Dó maior' }, color: '#3B82F6' },
      { fret_start: 10, fret_end: 12, description: { en: 'A minor pentatonic' }, color: null },
      { fret_start: 0, fret_end: 1, description: { en: 'Open' }, color: null },
    ])
  })

  it('spans a layer’s own positions for its region, even those a higher layer covers', () => {
    const base = layer({ positions: [position({ fret: 3 }), position({ string: 5, fret: 9 })] })
    const overlay = layer({ positions: [position({ string: 5, fret: 9 })] })

    const result = flattenDiagramStack([base, overlay], { languages: ['en'], regionPerLayer: true })

    expect(result.regions.map((r) => [r.fret_start, r.fret_end])).toEqual([
      [3, 9],
      [9, 9],
    ])
  })

  it('adds no generated region for a layer without fretted positions', () => {
    const result = flattenDiagramStack(
      [layer({ positions: [] }), layer({ positions: [position({ string: undefined, fret: undefined, key: 'C4' })] })],
      { languages: ['en'], regionPerLayer: true },
    )

    expect(result.regions).toEqual([])
  })

  it('classifies the result under every layer’s skills and concepts, once each', () => {
    const result = flattenDiagramStack(
      [
        layer({ skillIds: ['s1', 's2'], conceptIds: ['c1'] }),
        layer({ skillIds: ['s2', 's3'], conceptIds: ['c1', 'c2'] }),
      ],
      bothLanguages,
    )

    expect(result.skillIds).toEqual(['s1', 's2', 's3'])
    expect(result.conceptIds).toEqual(['c1', 'c2'])
  })
})

describe('stackLayerFromDiagram', () => {
  it('takes a saved diagram’s names, colour, positions, regions and classification ids', () => {
    const p = position()
    const region: DiagramRegion = { fret_start: 1, fret_end: 2, description: { en: 'x' }, color: null }
    const skill = { skill_id: 's1', name: 'Scales', parent_id: null }
    const concept = { concept_id: 'c1', name: 'Pentatonic', parent_id: null }

    const saved = makeFrettedDiagram({
      names: { en: 'A minor pentatonic' },
      color: '#F59E0B',
      positions: [p],
      regions: [region],
      classification: { skills: [skill], concepts: [concept] },
    })

    expect(stackLayerFromDiagram(saved)).toEqual({
      names: { en: 'A minor pentatonic' },
      color: '#F59E0B',
      positions: [p],
      regions: [region],
      skillIds: ['s1'],
      conceptIds: ['c1'],
    })
  })

  it('treats a diagram served without regions or colour as having none', () => {
    const old = makeFrettedDiagram({ color: undefined, regions: undefined })

    expect(stackLayerFromDiagram(old)).toMatchObject({ color: null, regions: [] })
  })
})
