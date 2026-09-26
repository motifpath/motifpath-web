import { describe, expect, it } from 'vitest'

import { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { useDiagramOverlays } from '@/features/teacher/composables/useDiagramOverlays'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'

const base = makeFrettedDiagram({
  diagram_id: 'd-base',
  names: { en: 'C major', pt_BR: 'Dó maior' },
  languages: ['en', 'pt_BR'],
  root_note: 'C',
  color: '#3B82F6',
  positions: [
    { position_id: 'b1', string: 5, fret: 3, interval: 'R', note_name: 'C', shape: 'dot', sequence_index: 0 },
    { position_id: 'b2', string: 4, fret: 5, interval: '5', note_name: 'G', shape: 'dot', sequence_index: 1 },
  ],
  regions: [],
  classification: {
    skills: [{ skill_id: 's1', name: 'Scales', parent_id: null }],
    concepts: [{ concept_id: 'c1', name: 'Major', parent_id: null }],
  },
})

const overlay = makeFrettedDiagram({
  diagram_id: 'd-penta',
  names: { en: 'A minor pentatonic' },
  languages: ['en'],
  root_note: 'A',
  color: null,
  positions: [
    { position_id: 'o1', string: 4, fret: 5, interval: 'b7', note_name: 'G', shape: 'square', sequence_index: 0 },
    { position_id: 'o2', string: 3, fret: 2, interval: 'R', note_name: 'A', shape: 'dot', sequence_index: 1 },
  ],
  regions: [],
  classification: {
    skills: [{ skill_id: 's2', name: 'Pentatonics', parent_id: null }],
    concepts: [{ concept_id: 'c1', name: 'Major', parent_id: null }],
  },
})

function setup() {
  const form = useDiagramForm()
  form.loadFromDiagram(base)
  return { form, overlays: useDiagramOverlays(form) }
}

describe('useDiagramOverlays', () => {
  it('starts with no overlays', () => {
    const { overlays } = setup()

    expect(overlays.overlays.value).toEqual([])
    expect(overlays.hasOverlays.value).toBe(false)
    expect(overlays.overlayIds.value).toEqual([])
  })

  it('adds an overlay once, and removes it', () => {
    const { overlays } = setup()

    overlays.add(overlay)
    overlays.add(overlay)
    expect(overlays.overlayIds.value).toEqual(['d-penta'])
    expect(overlays.hasOverlays.value).toBe(true)

    overlays.remove('d-penta')
    expect(overlays.hasOverlays.value).toBe(false)
  })

  it("previews the stack as merged, without changing the diagram's own positions", () => {
    const { form, overlays } = setup()
    overlays.add(overlay)

    const preview = overlays.preview.value

    expect(preview?.positions.map((p) => [p.string, p.fret, p.interval])).toEqual([
      [5, 3, 'R'],
      [4, 5, 'b7'],
      [3, 2, 'R'],
    ])
    expect(form.positions.value).toHaveLength(2)
  })

  it('has no preview without overlays', () => {
    const { overlays } = setup()

    expect(overlays.preview.value).toBeNull()
  })

  it('merges the overlays into the form and clears them', () => {
    const { form, overlays } = setup()
    overlays.add(overlay)

    overlays.merge({ regionPerLayer: false })

    expect(overlays.hasOverlays.value).toBe(false)
    expect(form.positions.value.map((p) => [p.string, p.fret, p.interval, p.color])).toEqual([
      [5, 3, 'R', '#3B82F6'],
      [4, 5, 'b7', null],
      [3, 2, 'R', null],
    ])
    expect(form.skillIds.value).toEqual(['s1', 's2'])
    expect(form.conceptIds.value).toEqual(['c1'])
    expect(form.regions.value).toEqual([])
    expect(form.rootNote.value).toBe('C')
  })

  it('adds one region per layer when asked, captioned in the diagram languages', () => {
    const { form, overlays } = setup()
    overlays.add(overlay)

    overlays.merge({ regionPerLayer: true })

    expect(form.regions.value.map((r) => [r.fretStart, r.fretEnd, r.description])).toEqual([
      [3, 5, { en: 'C major', pt_BR: 'Dó maior' }],
      [2, 5, { en: 'A minor pentatonic' }],
    ])
    expect(form.missingText.value.pt_BR).toContainEqual({ kind: 'regionCaption', region: 2 })
  })

  it("can merge only once every one of the diagram's own positions has an interval", () => {
    const form = useDiagramForm()
    const overlays = useDiagramOverlays(form)
    form.addPosition({ string: 6, fret: 5 })
    overlays.add(overlay)

    expect(overlays.canMerge.value).toBe(false)

    form.tuning.value = ['E', 'A', 'D', 'G', 'B', 'E']
    form.rootNote.value = 'A'
    form.recomputeFromRoot()
    expect(overlays.canMerge.value).toBe(true)
  })

  it('has nothing to merge without overlays', () => {
    const { overlays } = setup()

    expect(overlays.canMerge.value).toBe(false)
  })
})
