import { describe, expect, it } from 'vitest'

import { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'

describe('useDiagramForm', () => {
  it('starts empty with no positions and nothing markable as valid', () => {
    const form = useDiagramForm()

    expect(form.name.value).toBe('')
    expect(form.instrumentId.value).toBe('')
    expect(form.positions.value).toEqual([])
    expect(form.hasName.value).toBe(false)
    expect(form.hasPositions.value).toBe(false)
    expect(form.hasClassification.value).toBe(false)
    expect(form.canSave.value).toBe(false)
  })

  it('adds a position at the given cell with empty interval/note_name, sequenced by placement order, shaped as a dot', () => {
    const form = useDiagramForm()

    form.addPosition({ string: 6, fret: 5 })

    expect(form.positions.value).toHaveLength(1)
    expect(form.positions.value[0]).toMatchObject({ string: 6, fret: 5, interval: '', noteName: '', shape: 'dot', sequenceIndex: 0 })
    expect(form.positions.value[0].id).toBeTruthy()
  })

  it('sets a position\'s shape', () => {
    const form = useDiagramForm()
    form.addPosition({ string: 6, fret: 5 })
    const id = form.positions.value[0].id

    form.setPositionShape(id, 'star')

    expect(form.positions.value[0].shape).toBe('star')
  })

  it('does not add a second position on a cell that already has one', () => {
    const form = useDiagramForm()

    form.addPosition({ string: 6, fret: 5 })
    form.addPosition({ string: 6, fret: 5 })

    expect(form.positions.value).toHaveLength(1)
  })

  it('removes a position by id', () => {
    const form = useDiagramForm()
    form.addPosition({ string: 6, fret: 5 })
    const id = form.positions.value[0].id

    form.removePosition(id)

    expect(form.positions.value).toHaveLength(0)
  })

  it('toggleCell adds a position on an empty cell and removes it on an occupied one', () => {
    const form = useDiagramForm()

    form.toggleCell({ string: 6, fret: 5 })
    expect(form.positions.value).toHaveLength(1)

    form.toggleCell({ string: 6, fret: 5 })
    expect(form.positions.value).toHaveLength(0)
  })

  it('reorders positions and re-derives every sequence_index from the new array order', () => {
    const form = useDiagramForm()
    form.addPosition({ string: 6, fret: 5 })
    form.addPosition({ string: 5, fret: 3 })
    form.addPosition({ string: 4, fret: 2 })
    const [first, second, third] = form.positions.value.map((p) => p.id)
    expect(form.positions.value.map((p) => p.sequenceIndex)).toEqual([0, 1, 2])

    form.reorderPositions(0, 2)

    expect(form.positions.value.map((p) => p.id)).toEqual([second, third, first])
    expect(form.positions.value.map((p) => p.sequenceIndex)).toEqual([0, 1, 2])
  })

  it('auto-fills interval and note_name from tuning + root note when a position is placed', () => {
    const form = useDiagramForm()
    form.tuning.value = ['E', 'A', 'D', 'G', 'B', 'E']
    form.rootNote.value = 'A'

    form.addPosition({ string: 6, fret: 5 })

    expect(form.positions.value[0]).toMatchObject({ noteName: 'A', interval: 'R' })
  })

  it('leaves interval/note_name empty when tuning or root note is not set yet', () => {
    const form = useDiagramForm()

    form.addPosition({ string: 6, fret: 5 })

    expect(form.positions.value[0]).toMatchObject({ interval: '', noteName: '' })
  })

  it('recomputes every position from the new root when the root note changes', () => {
    const form = useDiagramForm()
    form.tuning.value = ['E', 'A', 'D', 'G', 'B', 'E']
    form.rootNote.value = 'A'
    form.addPosition({ string: 6, fret: 5 }) // A

    form.rootNote.value = 'E'
    form.recomputeFromRoot()

    expect(form.positions.value[0]).toMatchObject({ noteName: 'A', interval: '4' })
  })

  it('canSave requires a name, at least one position, and both a skill and a concept', () => {
    const form = useDiagramForm()
    form.tuning.value = ['E', 'A', 'D', 'G', 'B', 'E']
    form.rootNote.value = 'A'

    form.name.value = 'Minor Pentatonic'
    expect(form.canSave.value).toBe(false)

    form.addPosition({ string: 6, fret: 5 })
    expect(form.canSave.value).toBe(false)

    form.skillIds.value = ['s-1']
    expect(form.canSave.value).toBe(false)

    form.conceptIds.value = ['c-1']
    expect(form.canSave.value).toBe(true)
  })

  it('canSave stays false while any placed position is missing an interval or note name (no root/tuning set yet)', () => {
    const form = useDiagramForm()
    form.name.value = 'Minor Pentatonic'
    form.skillIds.value = ['s-1']
    form.conceptIds.value = ['c-1']
    form.addPosition({ string: 6, fret: 5 })

    // No tuning/root set: interval and noteName both stay empty (auto-fill has nothing to compute from).
    expect(form.canSave.value).toBe(false)

    form.tuning.value = ['E', 'A', 'D', 'G', 'B', 'E']
    form.rootNote.value = 'A'
    form.recomputeFromRoot()
    expect(form.canSave.value).toBe(true)

    // A second position added after tuning/root are set is auto-filled immediately, so save stays enabled.
    form.addPosition({ string: 5, fret: 3 })
    expect(form.canSave.value).toBe(true)
  })

  it('maps form state to a CreateDiagramRequest, including root_note and label_display', () => {
    const form = useDiagramForm()
    form.name.value = 'Minor Pentatonic — Position 1'
    form.instrumentId.value = 'instrument-guitar'
    form.skillIds.value = ['s-1']
    form.conceptIds.value = ['c-1']
    form.tuning.value = ['E', 'A', 'D', 'G', 'B', 'E']
    form.rootNote.value = 'A'
    form.labelDisplay.value = 'note'
    form.addPosition({ string: 6, fret: 5 })
    form.setPositionShape(form.positions.value[0].id, 'star')

    const request = form.toCreateDiagramRequest()

    expect(request).toEqual({
      instrument_id: 'instrument-guitar',
      name: 'Minor Pentatonic — Position 1',
      root_note: 'A',
      label_display: 'note',
      color: null,
      positions: [{ position_id: form.positions.value[0].id, string: 6, fret: 5, interval: 'R', note_name: 'A', shape: 'star', sequence_index: 0 }],
      classification: { skill_ids: ['s-1'], concept_ids: ['c-1'] },
    })
  })

  it('sends a null root_note on create when none has been set', () => {
    const form = useDiagramForm()
    form.name.value = 'D'
    form.instrumentId.value = 'instrument-guitar'

    const request = form.toCreateDiagramRequest()

    expect(request.root_note).toBeNull()
    expect(request.label_display).toBe('interval')
  })

  it('maps form state to an UpdateDiagramRequest, without instrument_id, omitting an unset root_note', () => {
    const form = useDiagramForm()
    form.name.value = 'Renamed'
    form.skillIds.value = ['s-1']
    form.conceptIds.value = ['c-1']

    const request = form.toUpdateDiagramRequest()

    expect(request).toEqual({
      name: 'Renamed',
      label_display: 'interval',
      positions: [],
      classification: { skill_ids: ['s-1'], concept_ids: ['c-1'] },
    })
    expect(request.root_note).toBeUndefined()
  })

  it('includes root_note in an UpdateDiagramRequest once set', () => {
    const form = useDiagramForm()
    form.name.value = 'Renamed'
    form.rootNote.value = 'E'

    const request = form.toUpdateDiagramRequest()

    expect(request.root_note).toBe('E')
  })

  it('loads form state from an existing Diagram, including root_note, label_display and each position\'s shape', () => {
    const form = useDiagramForm()
    const diagram = makeFrettedDiagram({
      root_note: 'A',
      label_display: 'note',
      classification: {
        skills: [{ skill_id: 's-1', name: 'Pentatonic scales', parent_id: null }],
        concepts: [{ concept_id: 'c-1', name: 'Scale construction', parent_id: null }],
      },
    })

    form.loadFromDiagram(diagram)

    expect(form.name.value).toBe(diagram.name)
    expect(form.instrumentId.value).toBe(diagram.instrument_id)
    expect(form.rootNote.value).toBe('A')
    expect(form.labelDisplay.value).toBe('note')
    expect(form.positions.value).toHaveLength(diagram.positions.length)
    expect(form.positions.value[0]).toMatchObject({
      id: 'p0',
      string: 6,
      fret: 5,
      interval: 'R',
      noteName: 'A',
      shape: 'dot',
      sequenceIndex: 0,
    })
    expect(form.skillIds.value).toEqual(['s-1'])
    expect(form.conceptIds.value).toEqual(['c-1'])
  })

  it('loads an unrecorded root_note as empty', () => {
    const form = useDiagramForm()
    const diagram = makeFrettedDiagram({ root_note: null })

    form.loadFromDiagram(diagram)

    expect(form.rootNote.value).toBe('')
  })

  describe('colors', () => {
    function placedForm() {
      const form = useDiagramForm()
      form.name.value = 'D'
      form.instrumentId.value = 'instrument-guitar'
      form.addPosition({ string: 6, fret: 5 })
      form.addPosition({ string: 6, fret: 8 })
      return form
    }

    it('starts with no general color and no position colors', () => {
      const form = placedForm()

      expect(form.color.value).toBeNull()
      expect(form.positions.value.every((p) => p.color === null)).toBe(true)
    })

    it("sets and clears a position's own color", () => {
      const form = placedForm()
      const id = form.positions.value[0]!.id

      form.setPositionColor(id, '#EF4444')
      expect(form.positions.value[0]?.color).toBe('#EF4444')
      expect(form.positions.value[1]?.color).toBeNull()

      form.setPositionColor(id, null)
      expect(form.positions.value[0]?.color).toBeNull()
    })

    it('sends the general and per-position colors on create, and null when unset', () => {
      const form = placedForm()
      form.color.value = '#3B82F6'
      form.setPositionColor(form.positions.value[0]!.id, '#EF4444')

      const request = form.toCreateDiagramRequest()

      expect(request.color).toBe('#3B82F6')
      expect(request.positions[0]?.color).toBe('#EF4444')
      expect(request.positions[1]?.color).toBeUndefined()

      const bare = useDiagramForm()
      bare.name.value = 'D'
      expect(bare.toCreateDiagramRequest().color).toBeNull()
    })

    it('sends the general color on update only once set (it cannot be cleared), and per-position colors with the positions', () => {
      const form = placedForm()
      expect(form.toUpdateDiagramRequest().color).toBeUndefined()

      form.color.value = '#22C55E'
      form.setPositionColor(form.positions.value[1]!.id, '#F59E0B')
      const request = form.toUpdateDiagramRequest()

      expect(request.color).toBe('#22C55E')
      expect(request.positions?.[1]?.color).toBe('#F59E0B')
      expect(request.positions?.[0]?.color).toBeUndefined()
    })

    it("loads the general color and each position's color from an existing Diagram", () => {
      const base = makeFrettedDiagram()
      const diagram = makeFrettedDiagram({
        color: '#3B82F6',
        positions: base.positions.map((p, i) => (i === 0 ? { ...p, color: '#EF4444' } : p)),
      })
      const form = useDiagramForm()

      form.loadFromDiagram(diagram)

      expect(form.color.value).toBe('#3B82F6')
      expect(form.positions.value[0]?.color).toBe('#EF4444')
      expect(form.positions.value[1]?.color).toBeNull()
    })

    it('can clear the general color until a color has been saved, since an update cannot unset it', () => {
      const form = useDiagramForm()
      expect(form.canClearColor.value).toBe(true)

      form.loadFromDiagram(makeFrettedDiagram({ color: '#3B82F6' }))
      expect(form.canClearColor.value).toBe(false)

      form.loadFromDiagram(makeFrettedDiagram({ color: null }))
      expect(form.canClearColor.value).toBe(true)

      form.markSaved(makeFrettedDiagram({ color: '#22C55E' }))
      expect(form.canClearColor.value).toBe(false)
    })

    it('loads an unrecorded general color as null', () => {
      const form = useDiagramForm()

      form.loadFromDiagram(makeFrettedDiagram())

      expect(form.color.value).toBeNull()
    })
  })
})
