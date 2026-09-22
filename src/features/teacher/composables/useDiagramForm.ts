import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type CreateDiagramRequest = components['schemas']['CreateDiagramRequest']
type UpdateDiagramRequest = components['schemas']['UpdateDiagramRequest']
type DiagramPosition = components['schemas']['DiagramPosition']

export interface FrettedCell {
  string: number
  fret: number
}

export interface LocalPosition extends FrettedCell {
  id: string
  interval: string
  noteName: string
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

  const hasName = computed(() => name.value.trim() !== '')
  const hasPositions = computed(() => positions.value.length > 0)
  const hasClassification = computed(() => skillIds.value.length > 0 && conceptIds.value.length > 0)
  const canSave = computed(() => hasName.value && hasPositions.value && hasClassification.value)

  function addPosition(cell: FrettedCell) {
    if (positions.value.some((p) => sameCell(p, cell))) return
    positions.value.push({ id: makeId(), ...cell, interval: '', noteName: '', sequenceIndex: null })
  }

  function removePosition(id: string) {
    positions.value = positions.value.filter((p) => p.id !== id)
  }

  function toggleCell(cell: FrettedCell) {
    const existing = positions.value.find((p) => sameCell(p, cell))
    if (existing) removePosition(existing.id)
    else addPosition(cell)
  }

  function editPositionInterval(id: string, interval: string) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.interval = interval
  }

  function editPositionNoteName(id: string, noteName: string) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.noteName = noteName
  }

  function setSequenceIndex(id: string, sequenceIndex: number | null) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.sequenceIndex = sequenceIndex
  }

  function toCreateDiagramRequest(): CreateDiagramRequest {
    return {
      instrument_id: instrumentId.value,
      name: name.value,
      positions: positions.value.map(toDiagramPosition),
      classification: { skill_ids: [...skillIds.value], concept_ids: [...conceptIds.value] },
    }
  }

  function toUpdateDiagramRequest(): UpdateDiagramRequest {
    return {
      name: name.value,
      positions: positions.value.map(toDiagramPosition),
      classification: { skill_ids: [...skillIds.value], concept_ids: [...conceptIds.value] },
    }
  }

  function loadFromDiagram(diagram: Diagram) {
    name.value = diagram.name
    instrumentId.value = diagram.instrument_id
    positions.value = diagram.positions.map((p) => ({
      id: p.position_id ?? makeId(),
      string: p.string ?? 0,
      fret: p.fret ?? 0,
      interval: p.interval,
      noteName: p.note_name,
      sequenceIndex: p.sequence_index ?? null,
    }))
    skillIds.value = diagram.classification.skills.map((s) => s.skill_id)
    conceptIds.value = diagram.classification.concepts.map((c) => c.concept_id)
  }

  return {
    name,
    instrumentId,
    positions,
    skillIds,
    conceptIds,
    hasName,
    hasPositions,
    hasClassification,
    canSave,
    addPosition,
    removePosition,
    toggleCell,
    editPositionInterval,
    editPositionNoteName,
    setSequenceIndex,
    toCreateDiagramRequest,
    toUpdateDiagramRequest,
    loadFromDiagram,
  }
}
