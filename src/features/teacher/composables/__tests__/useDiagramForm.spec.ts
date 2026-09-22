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

  it('adds a position at the given cell with empty interval/note_name and no sequence', () => {
    const form = useDiagramForm()

    form.addPosition({ string: 6, fret: 5 })

    expect(form.positions.value).toHaveLength(1)
    expect(form.positions.value[0]).toMatchObject({ string: 6, fret: 5, interval: '', noteName: '', sequenceIndex: null })
    expect(form.positions.value[0].id).toBeTruthy()
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

  it('edits a position interval and note name', () => {
    const form = useDiagramForm()
    form.addPosition({ string: 6, fret: 5 })
    const id = form.positions.value[0].id

    form.editPositionInterval(id, 'R')
    form.editPositionNoteName(id, 'A')

    expect(form.positions.value[0]).toMatchObject({ interval: 'R', noteName: 'A' })
  })

  it('sets and clears a position sequence index', () => {
    const form = useDiagramForm()
    form.addPosition({ string: 6, fret: 5 })
    const id = form.positions.value[0].id

    form.setSequenceIndex(id, 0)
    expect(form.positions.value[0].sequenceIndex).toBe(0)

    form.setSequenceIndex(id, null)
    expect(form.positions.value[0].sequenceIndex).toBeNull()
  })

  it('canSave requires a name, at least one position, and both a skill and a concept', () => {
    const form = useDiagramForm()

    form.name.value = 'Minor Pentatonic'
    expect(form.canSave.value).toBe(false)

    form.addPosition({ string: 6, fret: 5 })
    expect(form.canSave.value).toBe(false)

    form.skillIds.value = ['s-1']
    expect(form.canSave.value).toBe(false)

    form.conceptIds.value = ['c-1']
    expect(form.canSave.value).toBe(true)
  })

  it('maps form state to a CreateDiagramRequest', () => {
    const form = useDiagramForm()
    form.name.value = 'Minor Pentatonic — Position 1'
    form.instrumentId.value = 'instrument-guitar'
    form.skillIds.value = ['s-1']
    form.conceptIds.value = ['c-1']
    form.addPosition({ string: 6, fret: 5 })
    form.editPositionInterval(form.positions.value[0].id, 'R')
    form.editPositionNoteName(form.positions.value[0].id, 'A')

    const request = form.toCreateDiagramRequest()

    expect(request).toEqual({
      instrument_id: 'instrument-guitar',
      name: 'Minor Pentatonic — Position 1',
      positions: [{ position_id: form.positions.value[0].id, string: 6, fret: 5, interval: 'R', note_name: 'A', sequence_index: null }],
      classification: { skill_ids: ['s-1'], concept_ids: ['c-1'] },
    })
  })

  it('maps form state to an UpdateDiagramRequest, without instrument_id', () => {
    const form = useDiagramForm()
    form.name.value = 'Renamed'
    form.skillIds.value = ['s-1']
    form.conceptIds.value = ['c-1']

    const request = form.toUpdateDiagramRequest()

    expect(request).toEqual({
      name: 'Renamed',
      positions: [],
      classification: { skill_ids: ['s-1'], concept_ids: ['c-1'] },
    })
  })

  it('loads form state from an existing Diagram', () => {
    const form = useDiagramForm()
    const diagram = makeFrettedDiagram({
      classification: {
        skills: [{ skill_id: 's-1', name: 'Pentatonic scales', parent_id: null }],
        concepts: [{ concept_id: 'c-1', name: 'Scale construction', parent_id: null }],
      },
    })

    form.loadFromDiagram(diagram)

    expect(form.name.value).toBe(diagram.name)
    expect(form.instrumentId.value).toBe(diagram.instrument_id)
    expect(form.positions.value).toHaveLength(diagram.positions.length)
    expect(form.positions.value[0]).toMatchObject({
      id: 'p0',
      string: 6,
      fret: 5,
      interval: 'R',
      noteName: 'A',
      sequenceIndex: 0,
    })
    expect(form.skillIds.value).toEqual(['s-1'])
    expect(form.conceptIds.value).toEqual(['c-1'])
  })
})
