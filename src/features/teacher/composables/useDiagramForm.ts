import { computed, ref } from 'vue'

import { intervalFromRoot, noteAtFret } from '@/shared/utils/musicTheory'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type CreateDiagramRequest = components['schemas']['CreateDiagramRequest']
type UpdateDiagramRequest = components['schemas']['UpdateDiagramRequest']
type DiagramPosition = components['schemas']['DiagramPosition']

export interface FrettedCell {
  string: number
  fret: number
}

export type PositionShape = DiagramPosition['shape']
export type LabelDisplay = Diagram['label_display']

export interface LocalPosition extends FrettedCell {
  id: string
  interval: string
  noteName: string
  shape: PositionShape
  sequenceIndex: number | null
}

function makeId(): string {
  return crypto.randomUUID()
}

function sameCell(position: FrettedCell, cell: FrettedCell): boolean {
  return position.string === cell.string && position.fret === cell.fret
}

function toDiagramPosition(position: LocalPosition): DiagramPosition {
  return {
    position_id: position.id,
    interval: position.interval,
    note_name: position.noteName,
    shape: position.shape,
    sequence_index: position.sequenceIndex,
    string: position.string,
    fret: position.fret,
  }
}

/**
 * Holds all authoring state for one fretted `Diagram` and maps it to the
 * Create/UpdateDiagramRequest shapes the API expects. Positions are
 * addressed by a client-generated id from the moment they're placed (before
 * any save round trip), matching the API's own allowance for a
 * client-supplied position_id.
 */
export function useDiagramForm() {
  const name = ref('')
  const instrumentId = ref('')
  const positions = ref<LocalPosition[]>([])
  const skillIds = ref<string[]>([])
  const conceptIds = ref<string[]>([])
  // Open-string note per string, lowest string first (Instrument.tuning) — and the
  // teacher-chosen root note. Both are authoring aids only: neither is persisted, they just
  // drive the interval/note_name auto-fill below.
  const tuning = ref<string[]>([])
  const rootNote = ref('')
  // Persisted with the diagram (Diagram.label_display); defaults to 'interval' like the API does.
  const labelDisplay = ref<LabelDisplay>('interval')

  const hasName = computed(() => name.value.trim() !== '')
  const hasPositions = computed(() => positions.value.length > 0)
  const hasClassification = computed(() => skillIds.value.length > 0 && conceptIds.value.length > 0)
  // The server rejects any position with an empty interval or note_name --
  // checked here too so a save attempt never round-trips just to learn that.
  const hasCompletePositions = computed(() =>
    positions.value.every((p) => p.interval.trim() !== '' && p.noteName.trim() !== ''),
  )
  const canSave = computed(
    () => hasName.value && hasPositions.value && hasCompletePositions.value && hasClassification.value,
  )

  // tuning is lowest-string-first; DiagramPosition.string counts from the highest-pitched
  // string (1), so the open note for a given string lives at the mirrored index.
  function openStringNote(stringNumber: number): string | undefined {
    return tuning.value.length > 0 ? tuning.value[tuning.value.length - stringNumber] : undefined
  }

  function computeNotes(cell: FrettedCell): { interval: string; noteName: string } {
    const openNote = openStringNote(cell.string)
    if (!openNote || rootNote.value.trim() === '') return { interval: '', noteName: '' }
    const noteName = noteAtFret(openNote, cell.fret)
    return { interval: intervalFromRoot(noteName, rootNote.value), noteName }
  }

  function reindexSequence() {
    positions.value.forEach((position, index) => (position.sequenceIndex = index))
  }

  function addPosition(cell: FrettedCell) {
    if (positions.value.some((p) => sameCell(p, cell))) return
    positions.value.push({ id: makeId(), ...cell, ...computeNotes(cell), shape: 'dot', sequenceIndex: null })
    reindexSequence()
  }

  function setPositionShape(id: string, shape: PositionShape) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.shape = shape
  }

  function removePosition(id: string) {
    positions.value = positions.value.filter((p) => p.id !== id)
    reindexSequence()
  }

  function reorderPositions(fromIndex: number, toIndex: number) {
    const reordered = [...positions.value]
    const [moved] = reordered.splice(fromIndex, 1)
    if (!moved) return
    reordered.splice(toIndex, 0, moved)
    positions.value = reordered
    reindexSequence()
  }

  function recomputeFromRoot() {
    positions.value.forEach((position) => Object.assign(position, computeNotes(position)))
  }

  function toggleCell(cell: FrettedCell) {
    const existing = positions.value.find((p) => sameCell(p, cell))
    if (existing) removePosition(existing.id)
    else addPosition(cell)
  }

  function toCreateDiagramRequest(): CreateDiagramRequest {
    return {
      instrument_id: instrumentId.value,
      name: name.value,
      root_note: rootNote.value.trim() === '' ? null : rootNote.value,
      label_display: labelDisplay.value,
      positions: positions.value.map(toDiagramPosition),
      classification: { skill_ids: [...skillIds.value], concept_ids: [...conceptIds.value] },
    }
  }

  function toUpdateDiagramRequest(): UpdateDiagramRequest {
    return {
      name: name.value,
      ...(rootNote.value.trim() === '' ? {} : { root_note: rootNote.value }),
      label_display: labelDisplay.value,
      positions: positions.value.map(toDiagramPosition),
      classification: { skill_ids: [...skillIds.value], concept_ids: [...conceptIds.value] },
    }
  }

  function loadFromDiagram(diagram: Diagram) {
    name.value = diagram.name
    instrumentId.value = diagram.instrument_id
    rootNote.value = diagram.root_note ?? ''
    labelDisplay.value = diagram.label_display ?? 'interval'
    positions.value = [...diagram.positions]
      .sort((a, b) => (a.sequence_index ?? 0) - (b.sequence_index ?? 0))
      .map((p) => ({
        id: p.position_id ?? makeId(),
        string: p.string ?? 0,
        fret: p.fret ?? 0,
        interval: p.interval,
        noteName: p.note_name,
        shape: p.shape ?? 'dot',
        sequenceIndex: p.sequence_index ?? null,
      }))
    reindexSequence()
    skillIds.value = diagram.classification.skills.map((s) => s.skill_id)
    conceptIds.value = diagram.classification.concepts.map((c) => c.concept_id)
  }

  return {
    name,
    instrumentId,
    positions,
    skillIds,
    conceptIds,
    tuning,
    rootNote,
    labelDisplay,
    hasName,
    hasPositions,
    hasCompletePositions,
    hasClassification,
    canSave,
    addPosition,
    removePosition,
    setPositionShape,
    toggleCell,
    reorderPositions,
    recomputeFromRoot,
    toCreateDiagramRequest,
    toUpdateDiagramRequest,
    loadFromDiagram,
  }
}
