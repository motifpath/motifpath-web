import { describe, expect, it } from 'vitest'

import { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'

describe('useDiagramForm', () => {
  it('starts empty with no positions and nothing markable as valid', () => {
    const form = useDiagramForm()

    expect(form.names.value).toEqual({})
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

    form.setName('en', 'Minor Pentatonic')
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
    form.setName('en', 'Minor Pentatonic')
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
    form.setName('en', 'Minor Pentatonic — Position 1')
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
      names: { en: 'Minor Pentatonic — Position 1' },
      kind: 'custom',
      root_note: 'A',
      label_display: 'note',
      color: null,
      positions: [{ position_id: form.positions.value[0].id, string: 6, fret: 5, interval: 'R', note_name: 'A', shape: 'star', sequence_index: 0 }],
      regions: [],
      classification: { skill_ids: ['s-1'], concept_ids: ['c-1'] },
    })
  })

  it('sends a null root_note on create when none has been set', () => {
    const form = useDiagramForm()
    form.setName('en', 'D')
    form.instrumentId.value = 'instrument-guitar'

    const request = form.toCreateDiagramRequest()

    expect(request.root_note).toBeNull()
    expect(request.label_display).toBe('interval')
  })

  it('maps form state to an UpdateDiagramRequest, without instrument_id, omitting an unset root_note', () => {
    const form = useDiagramForm()
    form.setName('en', 'Renamed')
    form.skillIds.value = ['s-1']
    form.conceptIds.value = ['c-1']

    const request = form.toUpdateDiagramRequest()

    expect(request).toEqual({
      names: { en: 'Renamed' },
      label_display: 'interval',
      positions: [],
      regions: [],
      classification: { skill_ids: ['s-1'], concept_ids: ['c-1'] },
    })
    expect(request.root_note).toBeUndefined()
  })

  it('includes root_note in an UpdateDiagramRequest once set', () => {
    const form = useDiagramForm()
    form.setName('en', 'Renamed')
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

    expect(form.names.value).toEqual(diagram.names)
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
      form.setName('en', 'D')
      form.instrumentId.value = 'instrument-guitar'
      // Tuning and root give each placed position its interval, which a request needs.
      form.tuning.value = ['E', 'A', 'D', 'G', 'B', 'E']
      form.rootNote.value = 'A'
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
      bare.setName('en', 'D')
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

  describe('saving a copy', () => {
    function loadedForm() {
      const form = useDiagramForm()
      form.loadFromDiagram(makeFrettedDiagram({ color: '#3B82F6' }))
      return form
    }

    it('builds a custom copy under the new name, with everything the editor shows', () => {
      const form = loadedForm()

      const request = form.toCopyRequest({ en: 'My Pentatonic' }, 'custom')

      expect(request.names).toEqual({ en: 'My Pentatonic' })
      expect(request.kind).toBe('custom')
      expect(request.instrument_id).toBe('instrument-guitar')
      expect(request.root_note).toBe('A')
      expect(request.color).toBe('#3B82F6')
      expect(request.positions.map((p) => [p.string, p.fret, p.interval])).toEqual(
        form.toCreateDiagramRequest().positions.map((p) => [p.string, p.fret, p.interval]),
      )
    })

    it('builds a basic copy when saving as a template', () => {
      expect(loadedForm().toCopyRequest({ en: 'Pentatonic Template', pt_BR: 'Modelo pentatônico' }, 'basic').kind).toBe('basic')
    })

    it("leaves every position id for the server to assign, since the source diagram's ids are already taken", () => {
      const request = loadedForm().toCopyRequest({ en: 'My Pentatonic' }, 'custom')

      expect(request.positions.length).toBeGreaterThan(0)
      expect(request.positions.every((p) => p.position_id === undefined)).toBe(true)
    })
  })

  describe('languages and names', () => {
    it('starts with the UI language as its only language', () => {
      const form = useDiagramForm()

      expect(form.languages.value).toEqual(['en'])
      expect(form.missingNameLanguages.value).toEqual(['en'])
    })

    it("loads a diagram's languages, in the offered order, and every name", () => {
      const form = useDiagramForm()

      form.loadFromDiagram(makeFrettedDiagram({ names: { pt_BR: 'Escala', en: 'Scale' }, languages: ['pt_BR', 'en'] }))

      expect(form.languages.value).toEqual(['en', 'pt_BR'])
      expect(form.names.value).toEqual({ en: 'Scale', pt_BR: 'Escala' })
    })

    it('adds a language once, in the offered order, still needing its name', () => {
      const form = useDiagramForm()
      form.loadFromDiagram(makeFrettedDiagram({ names: { pt_BR: 'Escala' }, languages: ['pt_BR'] }))

      form.addLanguage('en')
      form.addLanguage('en')

      expect(form.languages.value).toEqual(['en', 'pt_BR'])
      expect(form.missingNameLanguages.value).toEqual(['en'])
    })

    it("removes a language along with its name, but never the last one", () => {
      const form = useDiagramForm()
      form.setName('en', 'Scale')
      form.addLanguage('pt_BR')
      form.setName('pt_BR', 'Escala')

      form.removeLanguage('pt_BR')
      expect(form.languages.value).toEqual(['en'])
      expect(form.toCreateDiagramRequest().names).toEqual({ en: 'Scale' })

      form.removeLanguage('en')
      expect(form.languages.value).toEqual(['en'])
    })

    it('is named only once every one of its languages has a name', () => {
      const form = useDiagramForm()
      form.addLanguage('pt_BR')
      form.setName('en', 'Scale')
      form.setName('pt_BR', '   ')

      expect(form.missingNameLanguages.value).toEqual(['pt_BR'])
      expect(form.hasName.value).toBe(false)

      form.setName('pt_BR', 'Escala')
      expect(form.missingNameLanguages.value).toEqual([])
      expect(form.hasName.value).toBe(true)
    })

    it("sends only its own languages' names, trimmed", () => {
      const form = useDiagramForm()
      form.setName('en', '  Scale  ')
      form.setName('pt_BR', 'Escala')

      expect(form.toCreateDiagramRequest().names).toEqual({ en: 'Scale' })
      expect(form.toUpdateDiagramRequest().names).toEqual({ en: 'Scale' })
    })

    it('has every name only once all offered languages are chosen and named', () => {
      const form = useDiagramForm()
      form.setName('en', 'Scale')
      expect(form.hasEveryName.value).toBe(false)

      form.addLanguage('pt_BR')
      expect(form.hasEveryName.value).toBe(false)

      form.setName('pt_BR', 'Escala')
      expect(form.hasEveryName.value).toBe(true)
    })
  })

  describe('marker labels and notes', () => {
    function bilingualForm() {
      const form = useDiagramForm()
      form.setName('en', 'Scale')
      form.addLanguage('pt_BR')
      form.setName('pt_BR', 'Escala')
      form.addPosition({ string: 6, fret: 5 })
      form.addPosition({ string: 6, fret: 8 })
      return form
    }

    it('starts every position with no custom label or note', () => {
      const form = bilingualForm()

      expect(form.positions.value[0]).toMatchObject({ customLabel: {}, note: {} })
    })

    it("sets a position's custom label and note per language, and sends them trimmed", () => {
      const form = bilingualForm()
      const id = form.positions.value[1]!.id
      form.positions.value.forEach((p) => Object.assign(p, { interval: 'R', noteName: 'A' }))

      form.setPositionCustomLabel(id, 'en', ' Av ')
      form.setPositionCustomLabel(id, 'pt_BR', 'Ev')
      form.setPositionNote(id, 'en', 'Avoid it')
      form.setPositionNote(id, 'pt_BR', 'Evite')

      const [plain, annotated] = form.toCreateDiagramRequest().positions
      expect(annotated).toMatchObject({ custom_label: { en: 'Av', pt_BR: 'Ev' }, note: { en: 'Avoid it', pt_BR: 'Evite' } })
      expect(plain).not.toHaveProperty('custom_label')
      expect(plain).not.toHaveProperty('note')
      expect(form.toUpdateDiagramRequest().positions?.[1]).toMatchObject({ custom_label: { en: 'Av', pt_BR: 'Ev' } })
    })

    it('flags a language missing a label or note that another language has, and blocks saving until it is filled', () => {
      const form = bilingualForm()
      const id = form.positions.value[0]!.id
      form.setPositionNote(id, 'en', 'Start here')

      expect(form.missingTextLanguages.value).toEqual(['pt_BR'])
      expect(form.hasCompleteText.value).toBe(false)

      form.setPositionNote(id, 'pt_BR', 'Comece aqui')
      expect(form.missingTextLanguages.value).toEqual([])
      expect(form.hasCompleteText.value).toBe(true)
    })

    it('treats a label or note cleared in every language as none at all', () => {
      const form = bilingualForm()
      const id = form.positions.value[0]!.id
      form.setPositionCustomLabel(id, 'en', 'Av')
      form.setPositionCustomLabel(id, 'en', '  ')

      expect(form.missingTextLanguages.value).toEqual([])
    })

    it("still reports a language that's missing only its name", () => {
      const form = bilingualForm()
      form.setName('pt_BR', '')

      expect(form.missingTextLanguages.value).toEqual(['pt_BR'])
    })

    it("drops a removed language's labels and notes", () => {
      const form = bilingualForm()
      const id = form.positions.value[0]!.id
      form.setPositionNote(id, 'en', 'Start here')
      form.setPositionNote(id, 'pt_BR', 'Comece aqui')

      form.removeLanguage('pt_BR')

      expect(form.positions.value[0]!.note).toEqual({ en: 'Start here' })
    })

    it("loads each position's custom label and note from an existing Diagram", () => {
      const base = makeFrettedDiagram()
      const form = useDiagramForm()

      form.loadFromDiagram(
        makeFrettedDiagram({
          positions: base.positions.map((p, i) => (i === 1 ? { ...p, custom_label: { en: 'Av' }, note: { en: 'Avoid it' } } : p)),
        }),
      )

      expect(form.positions.value[1]).toMatchObject({ customLabel: { en: 'Av' }, note: { en: 'Avoid it' } })
      expect(form.positions.value[0]).toMatchObject({ customLabel: {}, note: {} })
    })
  })

  describe('text in other languages', () => {
    it("reports whether its labels, notes and region captions are written in every given language, names aside", () => {
      const form = useDiagramForm()
      form.setName('en', 'Scale')
      expect(form.hasTextIn(['en', 'pt_BR'])).toBe(true)

      form.addPosition({ string: 6, fret: 5 })
      form.setPositionNote(form.positions.value[0]!.id, 'en', 'Start here')
      expect(form.hasTextIn(['en'])).toBe(true)
      expect(form.hasTextIn(['en', 'pt_BR'])).toBe(false)

      form.setPositionNote(form.positions.value[0]!.id, 'pt_BR', 'Comece aqui')
      form.addRegion()
      expect(form.hasTextIn(['en', 'pt_BR'])).toBe(false)
    })
  })

  describe('regions', () => {
    it('adds a region spanning the placed positions, or the first frets when there are none', () => {
      const form = useDiagramForm()
      form.addRegion()
      expect(form.regions.value[0]).toMatchObject({ fretStart: 0, fretEnd: 3, stringStart: null, stringEnd: null, description: {}, color: null })

      form.addPosition({ string: 6, fret: 5 })
      form.addPosition({ string: 4, fret: 8 })
      form.addRegion()
      expect(form.regions.value[1]).toMatchObject({ fretStart: 5, fretEnd: 8 })
      expect(form.regions.value[0]!.id).not.toBe(form.regions.value[1]!.id)
    })

    it('edits and removes a region', () => {
      const form = useDiagramForm()
      form.addRegion()
      const id = form.regions.value[0]!.id

      form.setRegionFrets(id, 7, 10)
      form.setRegionStrings(id, 1, 3)
      form.setRegionDescription(id, 'en', 'Box 2')
      form.setRegionColor(id, '#22C55E')
      expect(form.regions.value[0]).toMatchObject({ fretStart: 7, fretEnd: 10, stringStart: 1, stringEnd: 3, description: { en: 'Box 2' }, color: '#22C55E' })

      form.removeRegion(id)
      expect(form.regions.value).toEqual([])
    })

    it('needs every region captioned in every language before it can save', () => {
      const form = useDiagramForm()
      form.setName('en', 'Scale')
      form.addRegion()
      const id = form.regions.value[0]!.id

      expect(form.missingTextLanguages.value).toEqual(['en'])
      form.setRegionDescription(id, 'en', 'Box 1')
      expect(form.missingTextLanguages.value).toEqual([])
    })

    it('says exactly what each language is missing: the name, a region caption, a started label or note', () => {
      const form = useDiagramForm()
      form.setName('en', 'Scale')
      form.addLanguage('pt_BR')
      form.addPosition({ string: 6, fret: 5 })
      form.addPosition({ string: 4, fret: 7 })
      const secondPosition = form.positions.value[1]!.id
      form.setPositionCustomLabel(secondPosition, 'en', 'Av')
      form.setPositionNote(secondPosition, 'pt_BR', 'Evite')
      form.addRegion()
      form.addRegion()
      form.setRegionDescription(form.regions.value[0]!.id, 'en', 'Box 1')

      expect(form.missingText.value).toEqual({
        en: [
          { kind: 'regionCaption', region: 2 },
          { kind: 'markerNote', position: 2 },
        ],
        pt_BR: [
          { kind: 'name' },
          { kind: 'regionCaption', region: 1 },
          { kind: 'regionCaption', region: 2 },
          { kind: 'markerLabel', position: 2 },
        ],
      })
      expect(form.missingTextLanguages.value).toEqual(['en', 'pt_BR'])
    })

    it('reports a backwards or out-of-range region as invalid', () => {
      const form = useDiagramForm()
      form.tuning.value = ['E', 'A', 'D', 'G', 'B', 'E']
      form.addRegion()
      const id = form.regions.value[0]!.id
      expect(form.invalidRegionIds.value).toEqual([])

      form.setRegionFrets(id, 8, 5)
      expect(form.invalidRegionIds.value).toEqual([id])

      form.setRegionFrets(id, 5, 8)
      form.setRegionStrings(id, 3, 1)
      expect(form.invalidRegionIds.value).toEqual([id])

      form.setRegionStrings(id, 1, 7)
      expect(form.invalidRegionIds.value).toEqual([id])

      form.setRegionStrings(id, null, null)
      expect(form.invalidRegionIds.value).toEqual([])
    })

    it('blocks saving while any text is missing or any region is invalid', () => {
      const form = useDiagramForm()
      form.loadFromDiagram(makeFrettedDiagram({ names: { en: 'Scale' }, languages: ['en'] }))
      form.skillIds.value = ['s']
      form.conceptIds.value = ['c']
      expect(form.canSave.value).toBe(true)

      form.addRegion()
      expect(form.canSave.value).toBe(false)
      const id = form.regions.value[0]!.id
      form.setRegionDescription(id, 'en', 'Box')
      expect(form.canSave.value).toBe(true)

      form.setRegionFrets(id, 9, 2)
      expect(form.canSave.value).toBe(false)
    })

    it('sends regions with their ids and only their own languages, on create and update', () => {
      const form = useDiagramForm()
      form.setName('en', 'Scale')
      form.addRegion()
      const id = form.regions.value[0]!.id
      form.setRegionFrets(id, 5, 8)
      form.setRegionDescription(id, 'en', ' Box 1 ')
      form.setRegionDescription(id, 'pt_BR', 'Caixa 1')

      const expected = { region_id: id, fret_start: 5, fret_end: 8, description: { en: 'Box 1' }, color: null }
      expect(form.toCreateDiagramRequest().regions).toEqual([expected])
      expect(form.toUpdateDiagramRequest().regions).toEqual([expected])
    })

    it('sends string bounds only when the region is limited to some strings', () => {
      const form = useDiagramForm()
      form.addRegion()
      const id = form.regions.value[0]!.id
      form.setRegionStrings(id, 1, 3)

      expect(form.toCreateDiagramRequest().regions?.[0]).toMatchObject({ string_start: 1, string_end: 3 })
    })

    it('sends an empty region list on update once every region is removed, so the server removes them too', () => {
      const form = useDiagramForm()
      form.loadFromDiagram(makeFrettedDiagram({ regions: [{ region_id: 'r1', fret_start: 5, fret_end: 8, description: { en: 'Box' }, color: null }] }))

      form.removeRegion('r1')

      expect(form.toUpdateDiagramRequest().regions).toEqual([])
    })

    it('loads regions from an existing Diagram, and a copy leaves their ids for the server to assign', () => {
      const form = useDiagramForm()
      form.loadFromDiagram(
        makeFrettedDiagram({
          regions: [{ region_id: 'r1', fret_start: 7, fret_end: 10, string_start: 1, string_end: 3, description: { en: 'Box 2', pt_BR: 'Caixa 2' }, color: '#22C55E' }],
        }),
      )

      expect(form.regions.value).toEqual([
        { id: 'r1', fretStart: 7, fretEnd: 10, stringStart: 1, stringEnd: 3, description: { en: 'Box 2', pt_BR: 'Caixa 2' }, color: '#22C55E' },
      ])
      const copy = form.toCopyRequest({ en: 'Copy', pt_BR: 'Cópia' }, 'custom')
      expect(copy.regions?.[0]).not.toHaveProperty('region_id')
      expect(copy.regions?.[0]).toMatchObject({ fret_start: 7, description: { en: 'Box 2', pt_BR: 'Caixa 2' } })
    })

    it("drops a removed language's region captions", () => {
      const form = useDiagramForm()
      form.addLanguage('pt_BR')
      form.addRegion()
      const id = form.regions.value[0]!.id
      form.setRegionDescription(id, 'en', 'Box')
      form.setRegionDescription(id, 'pt_BR', 'Caixa')

      form.removeLanguage('pt_BR')

      expect(form.regions.value[0]!.description).toEqual({ en: 'Box' })
    })
  })

  describe('merging a stack', () => {
    it("replaces the positions, regions and classification with the merged ones, keeping the diagram's own fields", () => {
      const form = useDiagramForm()
      form.loadFromDiagram(makeFrettedDiagram({ root_note: 'C', color: '#3B82F6', label_display: 'note' }))
      const namesBefore = { ...form.names.value }

      form.loadFlattened({
        positions: [
          {
            interval: 'R',
            note_name: 'A',
            shape: 'star',
            color: '#EF4444',
            sequence_index: 0,
            string: 3,
            fret: 2,
            custom_label: { en: 'Hi' },
            note: { en: 'Target' },
          },
          { interval: '5', note_name: 'E', shape: 'dot', sequence_index: 1, string: 2, fret: 5 },
        ],
        regions: [{ fret_start: 1, fret_end: 3, description: { en: 'Shape 1' }, color: null }],
        skillIds: ['s1'],
        conceptIds: ['c1', 'c2'],
      })

      expect(form.positions.value).toEqual([
        {
          id: expect.any(String),
          string: 3,
          fret: 2,
          interval: 'R',
          noteName: 'A',
          shape: 'star',
          color: '#EF4444',
          sequenceIndex: 0,
          customLabel: { en: 'Hi' },
          note: { en: 'Target' },
        },
        {
          id: expect.any(String),
          string: 2,
          fret: 5,
          interval: '5',
          noteName: 'E',
          shape: 'dot',
          color: null,
          sequenceIndex: 1,
          customLabel: {},
          note: {},
        },
      ])
      expect(form.regions.value).toEqual([
        { id: expect.any(String), fretStart: 1, fretEnd: 3, stringStart: null, stringEnd: null, description: { en: 'Shape 1' }, color: null },
      ])
      expect(form.skillIds.value).toEqual(['s1'])
      expect(form.conceptIds.value).toEqual(['c1', 'c2'])
      expect(form.names.value).toEqual(namesBefore)
      expect(form.instrumentId.value).toBe('instrument-guitar')
      expect(form.rootNote.value).toBe('C')
      expect(form.color.value).toBe('#3B82F6')
      expect(form.labelDisplay.value).toBe('note')
    })

    it('gives every merged position and region its own id', () => {
      const form = useDiagramForm()

      form.loadFlattened({
        positions: [
          { interval: 'R', note_name: 'A', shape: 'dot', sequence_index: 0, string: 6, fret: 5 },
          { interval: '5', note_name: 'E', shape: 'dot', sequence_index: 1, string: 5, fret: 7 },
        ],
        regions: [
          { fret_start: 5, fret_end: 8, description: { en: 'Shape 1' }, color: null },
          { fret_start: 7, fret_end: 10, description: { en: 'Shape 2' }, color: null },
        ],
        skillIds: [],
        conceptIds: [],
      })

      const ids = [...form.positions.value.map((p) => p.id), ...form.regions.value.map((r) => r.id)]
      expect(new Set(ids).size).toBe(4)
    })
  })

  describe('region caption length', () => {
    it('reports a region caption over 60 characters in the language it is written in, and blocks saving', () => {
      const form = useDiagramForm()
      form.addLanguage('pt_BR')
      form.setName('en', 'Shapes')
      form.setName('pt_BR', 'Desenhos')
      form.addRegion()
      const id = form.regions.value[0]!.id

      form.setRegionDescription(id, 'en', 'x'.repeat(61))
      form.setRegionDescription(id, 'pt_BR', 'y'.repeat(60))

      expect(form.missingText.value.en).toEqual([{ kind: 'regionCaptionTooLong', region: 1 }])
      expect(form.missingText.value.pt_BR).toEqual([])
      expect(form.hasCompleteText.value).toBe(false)
    })

    it('measures the caption as it will be sent, trimmed', () => {
      const form = useDiagramForm()
      form.addRegion()

      form.setRegionDescription(form.regions.value[0]!.id, 'en', ` ${'x'.repeat(60)} `)

      expect(form.missingText.value.en).toEqual([{ kind: 'name' }])
    })
  })
})
