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
  /** This marker's own #RRGGBB color; null = use the diagram's general color. */
  color: string | null
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
    ...(position.color ? { color: position.color } : {}),
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
  // Persisted with the diagram (Diagram.color): the general marker color as #RRGGBB, null = unrecorded.
  const color = ref<string | null>(null)
  // The general color the server last returned. An update cannot unset an already-saved color, so
  // clearing is only offered while none is saved.
  const savedColor = ref<string | null>(null)
  const canClearColor = computed(() => savedColor.value === null)

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
    positions.value.push({ id: makeId(), ...cell, ...computeNotes(cell), shape: 'dot', color: null, sequenceIndex: null })
    reindexSequence()
  }

  function setPositionShape(id: string, shape: PositionShape) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.shape = shape
  }

  function setPositionColor(id: string, positionColor: string | null) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.color = positionColor
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
      color: color.value,
      positions: positions.value.map(toDiagramPosition),
      classification: { skill_ids: [...skillIds.value], concept_ids: [...conceptIds.value] },
    }
  }

  function toUpdateDiagramRequest(): UpdateDiagramRequest {
    return {
      name: name.value,
      ...(rootNote.value.trim() === '' ? {} : { root_note: rootNote.value }),
      label_display: labelDisplay.value,
      // An already-set general color can't be cleared through an update, so an unset one is omitted.
      ...(color.value ? { color: color.value } : {}),
      positions: positions.value.map(toDiagramPosition),
      classification: { skill_ids: [...skillIds.value], concept_ids: [...conceptIds.value] },
    }
  }

  /** Records the server's copy of a just-saved diagram, so later saves are updates against it. */
  function markSaved(diagram: Diagram) {
    savedColor.value = diagram.color ?? null
  }

  function loadFromDiagram(diagram: Diagram) {
    name.value = diagram.name
    instrumentId.value = diagram.instrument_id
    rootNote.value = diagram.root_note ?? ''
    labelDisplay.value = diagram.label_display ?? 'interval'
    color.value = diagram.color ?? null
    savedColor.value = diagram.color ?? null
    positions.value = [...diagram.positions]
      .sort((a, b) => (a.sequence_index ?? 0) - (b.sequence_index ?? 0))
      .map((p) => ({
        id: p.position_id ?? makeId(),
        string: p.string ?? 0,
        fret: p.fret ?? 0,
        interval: p.interval,
        noteName: p.note_name,
        shape: p.shape ?? 'dot',
        color: p.color ?? null,
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
    color,
    canClearColor,
    hasName,
    hasPositions,
    hasCompletePositions,
    hasClassification,
    canSave,
    addPosition,
    removePosition,
    setPositionShape,
    setPositionColor,
    toggleCell,
    reorderPositions,
    recomputeFromRoot,
    toCreateDiagramRequest,
    toUpdateDiagramRequest,
    loadFromDiagram,
    markSaved,
  }
}
